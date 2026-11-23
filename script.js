
function toggleMobileMenu() { document.getElementById('mobile-nav').classList.toggle('open'); }
function closeMobileMenu() { document.getElementById('mobile-nav').classList.remove('open'); }

const GOOGLE_SHEET_CSV_URL = 'https://google.com';

const fallbackData = [
    { category: 'Трубы', name: 'Труба бесшовная 159×8 мм ст. 20ЮЧ', gost: 'ГОСТ 8732-78', stock: '18.4 т', price: '192 000 ₽/т' },
    { category: 'Трубы', name: 'Труба бесшовная 219×10 мм ст. 20ЮЧ', gost: 'ГОСТ 8732-78', stock: '12.0 т', price: '195 000 ₽/т' },
    { category: 'Отводы', name: 'Отвод крутоизогнутый 90° 159×8 ст. 20ЮЧ', gost: 'ГОСТ 17375-01', stock: '45 шт', price: '4 850 ₽/шт' },
    { category: 'Лист', name: 'Лист горячекатаный 16×2000×6000 ст. 20ЮЧ', gost: 'ТУ 14-1-4853', stock: '24.5 т', price: '148 000 ₽/т' },
    { category: 'Фланцы', name: 'Фланец воротниковый Ду150 Ру40 ст. 20ЮЧ', gost: 'ГОСТ 33259-15', stock: '30 шт', price: '6 200 ₽/шт' }
];

let allPriceRows = [];

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    return lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        return { category: cols[0] || '', name: cols[1] || '', gost: cols[2] || '', stock: cols[3] || '', price: cols[4] || '' };
    }).filter(item => item.name);
}

async function loadPriceList() {
    try {
        if (GOOGLE_SHEET_CSV_URL.includes('ВАШ_ID_ТАБЛИЦЫ')) {
            allPriceRows = fallbackData;
        } else {
            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            const csvText = await response.text();
            allPriceRows = parseCSV(csvText);
        }
    } catch (err) {
        allPriceRows = fallbackData;
    }
    const select = document.getElementById('price-cat-filter');
    [...new Set(allPriceRows.map(r => r.category).filter(Boolean))].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        select.appendChild(opt);
    });
    renderPriceRows(allPriceRows);
}

function renderPriceRows(rows) {
    const tbody = document.getElementById('price-table-body');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">По вашему запросу позиций не найдено</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => `
                <tr>
                    <td data-label="Категория" style="color: var(--text-muted);">${r.category}</td>
                    <td class="cell-title" style="font-weight: 700; color: var(--navy);">${r.name}</td>
                    <td data-label="Стандарт">${r.gost}</td>
                    <td data-label="Наличие" style="color: var(--success); font-weight: 600;">${r.stock}</td>
                    <td data-label="Цена с НДС" style="font-weight: 700;">${r.price}</td>
                    <td class="cell-action" style="text-align: right;">
                        <button class="btn btn-outline btn-sm" onclick="selectProduct('${r.name.replace(/'/g, "\\'")}')">В заявку</button>
                    </td>
                </tr>
            `).join('');
}

function filterPriceTable() {
    const q = document.getElementById('price-search').value.toLowerCase();
    const cat = document.getElementById('price-cat-filter').value;
    renderPriceRows(allPriceRows.filter(r => (!cat || r.category === cat) && (!q || [r.name, r.gost, r.category].join(' ').toLowerCase().includes(q))));
}
const DENSITY = 7850;
let currentTab = 'pipe';
let lastCalcSummary = '';

const calcConfig = {
    pipe: {
        unitLabel: 'Масса 1 погонного метра',
        presetLabel: 'Стандартный типоразмер по ГОСТ 8732-78',
        presets: [
            { label: 'Индивидуальный размер (вручную)', values: null },
            { label: 'Труба 57×4 мм (ГОСТ 8732-78)', values: { d: 57, s: 4, l: 12, qty: 1 } },
            { label: 'Труба 89×5 мм (ГОСТ 8732-78)', values: { d: 89, s: 5, l: 12, qty: 1 } },
            { label: 'Труба 108×6 мм (ГОСТ 8732-78)', values: { d: 108, s: 6, l: 12, qty: 1 } },
            { label: 'Труба 159×8 мм (ГОСТ 8732-78)', values: { d: 159, s: 8, l: 12, qty: 1 } },
            { label: 'Труба 219×10 мм (ГОСТ 8732-78)', values: { d: 219, s: 10, l: 12, qty: 1 } },
            { label: 'Труба 273×12 мм (ГОСТ 8732-78)', values: { d: 273, s: 12, l: 12, qty: 1 } },
            { label: 'Труба 325×14 мм (ГОСТ 8732-78)', values: { d: 325, s: 14, l: 12, qty: 1 } },
            { label: 'Труба 426×16 мм (ГОСТ 8732-78)', values: { d: 426, s: 16, l: 12, qty: 1 } }
        ],
        fields: [
            { id: 'd', label: 'Наружный диаметр D (мм)', val: 159, step: '0.1' },
            { id: 's', label: 'Толщина стенки S (мм)', val: 8, step: '0.1' },
            { id: 'l', label: 'Длина L (м)', val: 12, step: '0.1' },
            { id: 'qty', label: 'Количество (шт)', val: 1, step: '1' }
        ],
        compute: (v) => {
            if (v.d <= 2 * v.s || v.d <= 0 || v.s <= 0) return { unit: 0, total: 0, desc: '' };
            const mPerMeter = (Math.PI * (v.d - v.s) * v.s * DENSITY) / 1e6;
            const total = mPerMeter * v.l * v.qty;
            return { unit: mPerMeter, total: total, desc: `Труба сталь 20ЮЧ ${v.d}×${v.s} мм (ГОСТ 8732-78), длина ${v.l} м × ${v.qty} шт — расчётный вес ${total.toFixed(2)} кг` };
        }
    },
    sheet: {
        unitLabel: 'Масса 1 листа',
        presetLabel: 'Стандартный раскрой листа по ТУ 14-1-4853 / ГОСТ 19903',
        presets: [
            { label: 'Индивидуальный раскрой (вручную)', values: null },
            { label: 'Лист 10×1500×6000 мм', values: { s: 10, w: 1500, l: 6000, qty: 1 } },
            { label: 'Лист 12×2000×6000 мм', values: { s: 12, w: 2000, l: 6000, qty: 1 } },
            { label: 'Лист 16×2000×6000 мм', values: { s: 16, w: 2000, l: 6000, qty: 1 } },
            { label: 'Лист 20×2000×6000 мм', values: { s: 20, w: 2000, l: 6000, qty: 1 } },
            { label: 'Лист 30×2000×6000 мм', values: { s: 30, w: 2000, l: 6000, qty: 1 } },
            { label: 'Лист 40×2000×6000 мм', values: { s: 40, w: 2000, l: 6000, qty: 1 } }
        ],
        fields: [
            { id: 's', label: 'Толщина S (мм)', val: 16, step: '0.5' },
            { id: 'w', label: 'Ширина B (мм)', val: 2000, step: '10' },
            { id: 'l', label: 'Длина L (мм)', val: 6000, step: '10' },
            { id: 'qty', label: 'Количество листов (шт)', val: 1, step: '1' }
        ],
        compute: (v) => {
            const mOne = (v.s * v.w * v.l * DENSITY) / 1e9;
            const total = mOne * v.qty;
            return { unit: mOne, total: total, desc: `Лист сталь 20ЮЧ ${v.s}×${v.w}×${v.l} мм × ${v.qty} шт — расчётный вес ${total.toFixed(2)} кг` };
        }
    },
    round: {
        unitLabel: 'Масса 1 погонного метра',
        presetLabel: 'Стандартный диаметр по ГОСТ 2590-2006',
        presets: [
            { label: 'Индивидуальный диаметр (вручную)', values: null },
            { label: 'Круг D50 мм (ГОСТ 2590-2006)', values: { d: 50, l: 6, qty: 1 } },
            { label: 'Круг D80 мм (ГОСТ 2590-2006)', values: { d: 80, l: 6, qty: 1 } },
            { label: 'Круг D100 мм (ГОСТ 2590-2006)', values: { d: 100, l: 6, qty: 1 } },
            { label: 'Круг D120 мм (ГОСТ 2590-2006)', values: { d: 120, l: 4.5, qty: 1 } },
            { label: 'Круг D160 мм (ГОСТ 2590-2006)', values: { d: 160, l: 4, qty: 1 } },
            { label: 'Круг D200 мм (ГОСТ 2590-2006)', values: { d: 200, l: 3, qty: 1 } }
        ],
        fields: [
            { id: 'd', label: 'Диаметр круга D (мм)', val: 120, step: '1' },
            { id: 'l', label: 'Длина L (м)', val: 4.5, step: '0.1' },
            { id: 'qty', label: 'Количество (шт)', val: 1, step: '1' }
        ],
        compute: (v) => {
            const mPerMeter = (Math.PI * Math.pow(v.d / 2, 2) * DENSITY) / 1e6;
            const total = mPerMeter * v.l * v.qty;
            return { unit: mPerMeter, total: total, desc: `Круг сталь 20ЮЧ D${v.d} мм, длина ${v.l} м × ${v.qty} шт — расчётный вес ${total.toFixed(2)} кг` };
        }
    },
    flange: {
        unitLabel: 'Масса 1 заготовки / кольца',
        presetLabel: 'Типовые габариты заготовок фланцев ГОСТ 33259-2015',
        presets: [
            { label: 'Индивидуальные габариты (вручную)', values: null },
            { label: 'Заготовка под фланец Ду50 Ру40 (160/57×20)', values: { dout: 160, din: 57, h: 20, qty: 4 } },
            { label: 'Заготовка под фланец Ду100 Ру40 (235/108×24)', values: { dout: 235, din: 108, h: 24, qty: 4 } },
            { label: 'Заготовка под фланец Ду150 Ру40 (300/159×28)', values: { dout: 300, din: 159, h: 28, qty: 4 } },
            { label: 'Заготовка под фланец Ду200 Ру40 (375/219×34)', values: { dout: 375, din: 219, h: 34, qty: 2 } },
            { label: 'Заготовка под фланец Ду300 Ру40 (515/325×42)', values: { dout: 515, din: 325, h: 42, qty: 2 } }
        ],
        fields: [
            { id: 'dout', label: 'Наружный диаметр Dн (мм)', val: 300, step: '1' },
            { id: 'din', label: 'Внутренний диаметр Dв (мм)', val: 159, step: '1' },
            { id: 'h', label: 'Толщина / высота H (мм)', val: 28, step: '1' },
            { id: 'qty', label: 'Количество (шт)', val: 4, step: '1' }
        ],
        compute: (v) => {
            if (v.dout <= v.din) return { unit: 0, total: 0, desc: '' };
            const area = Math.PI * (Math.pow(v.dout / 2, 2) - Math.pow(v.din / 2, 2));
            const mOne = (area * v.h * DENSITY) / 1e9;
            const total = mOne * v.qty;
            return { unit: mOne, total: total, desc: `Заготовка/фланец сталь 20ЮЧ Dн${v.dout}/Dв${v.din}×${v.h} мм × ${v.qty} шт — расчётный вес ${total.toFixed(2)} кг` };
        }
    }
};
function switchCalcTab(type, btn) {
    currentTab = type;
    document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderCalcFields();
}

function renderCalcFields() {
    const cfg = calcConfig[currentTab];
    document.getElementById('res-unit-label').textContent = cfg.unitLabel;
    const presetOptions = cfg.presets.map((p, idx) => `<option value="${idx}">${p.label}</option>`).join('');
    const presetHtml = `
                <div class="calc-preset-box">
                    <div class="form-group">
                        <label for="calc-preset-select">${cfg.presetLabel}</label>
                        <select id="calc-preset-select" class="form-control" onchange="applyCalcPreset(this.value)">
                            ${presetOptions}
                        </select>
                    </div>
                </div>
            `;
    const inputsHtml = cfg.fields.map(f => `
                <div class="form-group">
                    <label for="inp-${f.id}">${f.label}</label>
                    <input type="number" inputmode="decimal" id="inp-${f.id}" class="form-control" value="${f.val}" step="${f.step}" min="0" oninput="onManualInput()">
                </div>
            `).join('');
    document.getElementById('calc-fields').innerHTML = presetHtml + inputsHtml;
    recalculate();
}

function applyCalcPreset(idx) {
    const preset = calcConfig[currentTab].presets[idx];
    if (!preset || !preset.values) return;
    Object.entries(preset.values).forEach(([key, val]) => {
        const inp = document.getElementById('inp-' + key);
        if (inp) inp.value = val;
    });
    recalculate();
}

function onManualInput() {
    const sel = document.getElementById('calc-preset-select');
    if (sel) sel.value = '0';
    recalculate();
}

function recalculate() {
    const cfg = calcConfig[currentTab];
    const values = {};
    cfg.fields.forEach(f => { values[f.id] = parseFloat(document.getElementById('inp-' + f.id).value) || 0; });
    const res = cfg.compute(values);
    document.getElementById('res-total-kg').textContent = res.total.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' кг';
    document.getElementById('res-total-ton').textContent = (res.total / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' т';
    document.getElementById('res-unit-val').textContent = res.unit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' кг';
    lastCalcSummary = res.desc;
}

function transferCalcToOrder() {
    if (!lastCalcSummary) return;
    const msgBox = document.getElementById('client-message');
    msgBox.value = msgBox.value ? msgBox.value + '\n' + lastCalcSummary : lastCalcSummary;
    document.getElementById('order-form').scrollIntoView({ behavior: 'smooth' });
    showToast('Параметры расчёта добавлены в форму заявки');
}

function selectProduct(name) {
    const msgBox = document.getElementById('client-message');
    const line = `Запрос стоимости: ${name}, количество: `;
    msgBox.value = msgBox.value ? msgBox.value + '\n' + line : line;
    document.getElementById('order-form').scrollIntoView({ behavior: 'smooth' });
    msgBox.focus();
}

function copyRequisites() {
    const text = 'ООО «Симбирская промышленная индустрия»\nЮр. адрес: 432071, г. Ульяновск, ул. Нижнеполевая, д. 11\nПочт. адрес: 432001, г. Ульяновск, а/я 2223\nТел.: +7 (904) 192-73-66\nEmail: bekmatov_ruslan@mail.ru';
    navigator.clipboard.writeText(text).then(() => showToast('Реквизиты скопированы в буфер обмена'));
}

let selectedFiles = [];

function handleFileSelect(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showToast(`Файл "${file.name}" превышает лимит 10 МБ`);
            return;
        }
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    input.value = '';
    renderFileList();
}

function removeSelectedFile(idx) {
    selectedFiles.splice(idx, 1);
    renderFileList();
}

function renderFileList() {
    const container = document.getElementById('file-list');
    container.innerHTML = selectedFiles.map((f, idx) => `
                <div class="file-chip">
                    <span>📄 ${f.name} (${(f.size / 1024).toFixed(0)} КБ)</span>
                    <button type="button" class="file-remove" aria-label="Удалить файл" onclick="removeSelectedFile(${idx})">×</button>
                </div>
            `).join('');
}

const WEB3FORMS_ACCESS_KEY = 'd0b3a7f4-6e5a-4dac-aa3b-012b8ad1473d';

async function handleOrderSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('submit-btn');
    const statusBox = document.getElementById('form-status');

    const clientName = document.getElementById('client-name').value.trim();
    const clientPhone = document.getElementById('client-phone').value.trim();
    const clientEmail = document.getElementById('client-email').value.trim() || 'Не указан';
    const clientMessage = document.getElementById('client-message').value.trim();

    const hasFiles = selectedFiles.length > 0;
    const filesNote = hasFiles
        ? `\n[Клиент выбрал файлы для отправки: ${selectedFiles.map(f => f.name).join(', ')}]`
        : '';

    btn.disabled = true;
    btn.textContent = 'Отправка заявки...';
    statusBox.className = 'form-status';
    statusBox.style.display = 'none';

    const formData = new FormData();
    formData.append('access_key', WEB3FORMS_ACCESS_KEY);
    formData.append('subject', 'Заявка с сайта Сталь 20ЮЧ от ' + clientName);
    formData.append('from_name', 'Сайт Сталь 20ЮЧ');
    formData.append('Client_Name', clientName);
    formData.append('Phone', clientPhone);
    formData.append('Email', clientEmail);
    formData.append('Specification', clientMessage + filesNote);

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (response.ok && result.success) {
            if (hasFiles) {
                const mailSubject = encodeURIComponent('Чертежи / спецификация к заявке Сталь 20ЮЧ от ' + clientName);
                const mailBody = encodeURIComponent(`Здравствуйте!\nНаправляю прикреплённые файлы (${selectedFiles.map(f => f.name).join(', ')}) к заявке:\n\nОрганизация: ${clientName}\nТелефон: ${clientPhone}\nЗаказ:\n${clientMessage}`);
                statusBox.innerHTML = `✓ Текст заявки отправлен! Чтобы передать прикреплённые файлы (${selectedFiles.length} шт.), нажмите <a href="mailto:bekmatov_ruslan@mail.ru?subject=${mailSubject}&body=${mailBody}" style="text-decoration:underline; color:#fff; font-weight:700;">открыть почту и прикрепить файлы</a> или отправьте их в <a href="https://t.me" target="_blank" style="text-decoration:underline; color:#fff; font-weight:700;">Telegram</a>.`;
            } else {
                statusBox.textContent = '✓ Заявка успешно отправлена на bekmatov_ruslan@mail.ru. Менеджер свяжется с вами в ближайшее время.';
            }
            statusBox.className = 'form-status success';
            showToast('Заявка успешно отправлена');
            form.reset();
            selectedFiles = [];
            renderFileList();
        } else {
            throw new Error(result.message || 'Ошибка сервиса отправки');
        }
    } catch (err) {
        const mailSubject = encodeURIComponent('Заявка Сталь 20ЮЧ от ' + clientName);
        const mailBody = encodeURIComponent(`Имя/Организация: ${clientName}\nТелефон: ${clientPhone}\nEmail: ${clientEmail}\n\nЗаявка:\n${clientMessage}`);
        statusBox.innerHTML = `Автоотправка временно недоступна. Нажмите, чтобы <a href="mailto:bekmatov_ruslan@mail.ru?subject=${mailSubject}&body=${mailBody}" style="text-decoration:underline; color:#fff; font-weight:700;">открыть письмо в вашей почте</a> с уже заполненным текстом.`;
        statusBox.className = 'form-status error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Отправить заявку на расчёт';
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

loadPriceList();
renderCalcFields();
