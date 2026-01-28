/**
 * 유비온 디지털교육센터 - K-Digital Training 통합 일정 스케줄러
 * Core Logic & UI Controller
 */

// --- Constants & Data ---

// 2025-2026 Korean Holidays (Fixed + Lunar approximations for simplicity or specific dates)
// 실제 운영 시에는 매년 업데이트가 필요할 수 있음. 여기서는 주요 공휴일 하드코딩.
const DEFAULT_HOLIDAYS = [
    { date: '2025-01-01', name: '신정' },
    { date: '2025-01-28', name: '설날 연휴' },
    { date: '2025-01-29', name: '설날' },
    { date: '2025-01-30', name: '설날 연휴' },
    { date: '2025-03-01', name: '삼일절' },
    { date: '2025-05-05', name: '어린이날' },
    { date: '2025-05-06', name: '부처님오신날' }, // 대체공휴일 등 고려 필요
    { date: '2025-06-06', name: '현충일' },
    { date: '2025-08-15', name: '광복절' },
    { date: '2025-10-03', name: '개천절' },
    { date: '2025-10-09', name: '한글날' },
    { date: '2025-12-25', name: '성탄절' },

    { date: '2026-01-01', name: '신정' },
    { date: '2026-02-16', name: '설날 연휴' }, // 2026 설날 (2/17)
    { date: '2026-02-17', name: '설날' },
    { date: '2026-02-18', name: '설날 연휴' },
    { date: '2026-03-01', name: '삼일절' },
    { date: '2026-05-05', name: '어린이날' },
    { date: '2026-05-24', name: '부처님오신날' },
    { date: '2026-06-06', name: '현충일' },
    { date: '2026-08-15', name: '광복절' },
    { date: '2026-09-24', name: '추석 연휴' }, // 2026 추석 (9/25)
    { date: '2026-09-25', name: '추석' },
    { date: '2026-09-26', name: '추석 연휴' },
    { date: '2026-10-03', name: '개천절' },
    { date: '2026-10-09', name: '한글날' },
    { date: '2026-12-25', name: '성탄절' }
];

// State
let appState = {
    cohorts: [], // { id, name, startDate, includeWeekends, curriculum: [{ subject, instructor, days, color }] }
    holidays: [...DEFAULT_HOLIDAYS],
    customHolidays: [],
    googleConfig: {
        apiKey: 'AIzaSyD-zp3ID1MdWeMMQoSMTzHsGcvXZVnNe4k',
        clientId: 'wiky0609@gmail.com', // User provided email, might be wrong but setting it as requested
        sheetId: '1upfeAj22FEoYAgtSckJLQJ-Tg6FWFxU1ea3IdjfhGzM'
    }
};

// Colors for subjects (Auto-assign)
const SUBJECT_COLORS = [
    'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800', 'bg-orange-100 text-orange-800'
];

// --- Core Logic: Date Engine ---

function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function getDayName(dateStr) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[new Date(dateStr).getDay()];
}

function isWeekend(dateStr) {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // 0=Sun, 6=Sat
}

function isHoliday(dateStr) {
    return appState.holidays.some(h => h.date === dateStr);
}

function getHolidayName(dateStr) {
    const h = appState.holidays.find(h => h.date === dateStr);
    return h ? h.name : null;
}

/**
 * Calculate schedule dates for a curriculum item
 * @param {string} startDateStr - Start date YYYY-MM-DD
 * @param {number} durationDays - Number of training days
 * @param {boolean} includeWeekends - Whether to count weekends as training days
 * @returns {object} { dates: string[], endDate: string }
 */
function calculateSchedule(startDateStr, durationDays, includeWeekends) {
    let dates = [];
    let currentDate = startDateStr;
    let daysCounted = 0;

    while (daysCounted < durationDays) {
        // Check if current date is valid training day
        let isOff = false;

        // 1. Holiday Check
        if (isHoliday(currentDate)) {
            isOff = true;
        }
        // 2. Weekend Check (if not included)
        else if (!includeWeekends && isWeekend(currentDate)) {
            isOff = true;
        }

        if (!isOff) {
            dates.push(currentDate);
            daysCounted++;
        }

        // Move to next day if we still need more days
        if (daysCounted < durationDays) {
            currentDate = addDays(currentDate, 1);
        }
    }

    return { dates, endDate: currentDate };
}

/**
 * Re-calculate all cohort schedules based on their start dates and curriculum
 */
function processCohorts() {
    appState.cohorts.forEach(cohort => {
        let currentStart = cohort.startDate;
        cohort.processedSchedule = []; // Flat list of { date, subject, instructor }

        cohort.curriculum.forEach((item, index) => {
            // Find next available start date (skip holidays/weekends if they land on start)
            // Actually, the calculateSchedule logic handles "skipping" days, 
            // but we need to ensure the *start* of a new subject doesn't land on a skip day?
            // No, calculateSchedule starts counting from currentStart. If currentStart is a holiday, it skips it inside the loop.
            // However, we should ensure the next subject starts on the day AFTER the previous one ended.

            // If this is not the first subject, currentStart is day after previous end
            if (index > 0) {
                currentStart = addDays(cohort.curriculum[index - 1].endDate, 1);
            }

            // Calculate dates
            const result = calculateSchedule(currentStart, item.days, cohort.includeWeekends);

            // Store result back to item
            item.startDate = result.dates[0]; // Actual first training day
            item.endDate = result.dates[result.dates.length - 1];
            item.dates = result.dates;

            // Add to processed schedule
            result.dates.forEach(d => {
                cohort.processedSchedule.push({
                    date: d,
                    subject: item.subject,
                    instructor: item.instructor,
                    color: item.color
                });
            });
        });
    });
}

// --- UI Controller ---

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupEventListeners();
    renderAll();
});

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tab;
            // Update buttons
            document.querySelectorAll('[data-tab]').forEach(b => {
                b.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-blue-50');
                b.classList.add('text-gray-500');
            });
            e.target.classList.add('text-blue-600', 'border-b-2', 'border-blue-600', 'bg-blue-50');
            e.target.classList.remove('text-gray-500');

            // Show content
            document.getElementById('tab-cohorts').classList.add('hidden');
            document.getElementById('tab-holidays').classList.add('hidden');
            document.getElementById(`tab-${tabId}`).classList.remove('hidden');
        });
    });

    // Add Cohort
    document.getElementById('addCohortBtn').addEventListener('click', addCohort);

    // Add Holiday
    document.getElementById('addHolidayBtn').addEventListener('click', addCustomHoliday);

    // Filter
    document.getElementById('instructorFilter').addEventListener('change', renderScheduler);

    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (confirm('모든 데이터를 삭제하고 초기화하시겠습니까?')) {
            localStorage.removeItem('bootcampSchedulerState');
            location.reload();
        }
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);

    // Go to Conflict
    document.getElementById('goToConflictBtn').addEventListener('click', () => {
        const firstConflict = document.querySelector('.conflict-row');
        if (firstConflict) {
            firstConflict.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash effect
            firstConflict.classList.add('bg-red-50');
            setTimeout(() => firstConflict.classList.remove('bg-red-50'), 2000);
        }
    });

    // Google Sheets
    document.getElementById('googleSettingsBtn').addEventListener('click', () => {
        document.getElementById('gApiKey').value = appState.googleConfig.apiKey;
        document.getElementById('gClientId').value = appState.googleConfig.clientId;
        document.getElementById('gSheetId').value = appState.googleConfig.sheetId;
        document.getElementById('googleSettingsModal').classList.remove('hidden');
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        document.getElementById('googleSettingsModal').classList.add('hidden');
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        appState.googleConfig.apiKey = document.getElementById('gApiKey').value;
        appState.googleConfig.clientId = document.getElementById('gClientId').value;
        appState.googleConfig.sheetId = document.getElementById('gSheetId').value;
        saveState();
        document.getElementById('googleSettingsModal').classList.add('hidden');
        alert('설정이 저장되었습니다.');
    });

    document.getElementById('googleSyncBtn').addEventListener('click', handleGoogleSync);
}

function loadState() {
    const saved = localStorage.getItem('bootcampSchedulerState');
    if (saved) {
        const parsed = JSON.parse(saved);
        appState.cohorts = parsed.cohorts || [];
        appState.customHolidays = parsed.customHolidays || [];
        appState.holidays = [...DEFAULT_HOLIDAYS, ...appState.customHolidays];
        if (parsed.googleConfig) {
            appState.googleConfig = parsed.googleConfig;
        }
    }

    // Set default date to today
    document.getElementById('cohortStartDate').value = new Date().toISOString().split('T')[0];
}

function saveState() {
    const toSave = {
        cohorts: appState.cohorts,
        customHolidays: appState.customHolidays,
        googleConfig: appState.googleConfig
    };
    localStorage.setItem('bootcampSchedulerState', JSON.stringify(toSave));
}

function addCustomHoliday() {
    const date = document.getElementById('customHolidayDate').value;
    const name = document.getElementById('customHolidayName').value;
    if (!date || !name) return alert('날짜와 휴일명을 입력해주세요.');

    appState.customHolidays.push({ date, name });
    appState.holidays = [...DEFAULT_HOLIDAYS, ...appState.customHolidays];

    // Sort holidays
    appState.holidays.sort((a, b) => a.date.localeCompare(b.date));

    saveState();
    renderHolidays();
    processCohorts(); // Recalculate schedules
    renderScheduler();

    document.getElementById('customHolidayName').value = '';
}

function addCohort() {
    const name = document.getElementById('cohortName').value;
    const startDate = document.getElementById('cohortStartDate').value;
    const includeWeekends = document.getElementById('includeWeekends').checked;
    const curriculumText = document.getElementById('cohortCurriculum').value;

    if (!name || !startDate || !curriculumText) {
        return alert('모든 필드를 입력해주세요.');
    }

    // Parse curriculum
    const curriculum = [];
    const lines = curriculumText.split('\n');
    let colorIdx = appState.cohorts.length % SUBJECT_COLORS.length;

    for (let line of lines) {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length >= 3) {
            curriculum.push({
                subject: parts[0],
                instructor: parts[1],
                days: parseInt(parts[2], 10),
                color: SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length]
            });
            colorIdx++;
        }
    }

    if (curriculum.length === 0) return alert('올바른 커리큘럼 형식이 아닙니다.');

    const newCohort = {
        id: Date.now().toString(),
        name,
        startDate,
        includeWeekends,
        curriculum
    };

    appState.cohorts.push(newCohort);
    saveState();

    // Clear form
    document.getElementById('cohortName').value = '';
    document.getElementById('cohortCurriculum').value = '';

    renderAll();
}

function deleteCohort(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    appState.cohorts = appState.cohorts.filter(c => c.id !== id);
    saveState();
    renderAll();
}

function cloneCohort(id) {
    const cohort = appState.cohorts.find(c => c.id === id);
    if (!cohort) return;

    document.getElementById('cohortName').value = `${cohort.name} (복사됨)`;
    document.getElementById('cohortStartDate').value = cohort.startDate;
    document.getElementById('includeWeekends').checked = cohort.includeWeekends;

    const curText = cohort.curriculum.map(c => `${c.subject}, ${c.instructor}, ${c.days}`).join('\n');
    document.getElementById('cohortCurriculum').value = curText;

    // Switch to tab
    document.querySelector('[data-tab="cohorts"]').click();
}

function renderAll() {
    processCohorts();
    renderCohortList();
    renderHolidays();
    updateInstructorFilter();
    renderScheduler();
}

function renderCohortList() {
    const list = document.getElementById('cohortList');
    list.innerHTML = '';

    appState.cohorts.forEach(c => {
        const div = document.createElement('div');
        div.className = 'bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center';
        div.innerHTML = `
            <div>
                <div class="font-bold text-gray-800 text-sm">${c.name}</div>
                <div class="text-xs text-gray-500">${c.startDate} 시작 | ${c.curriculum.length}개 과목</div>
            </div>
            <div class="flex gap-1">
                <button onclick="cloneCohort('${c.id}')" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="복제">
                    <i data-lucide="copy" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteCohort('${c.id}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="삭제">
                    <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();
}

function renderHolidays() {
    const list = document.getElementById('holidayList');
    list.innerHTML = '';

    // Sort by date
    const sorted = [...appState.holidays].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach(h => {
        const li = document.createElement('li');
        li.className = 'flex justify-between py-1 border-b border-gray-100 last:border-0';
        li.innerHTML = `
            <span>${h.date} <span class="text-gray-400">(${getDayName(h.date)})</span></span>
            <span class="font-medium">${h.name}</span>
        `;
        list.appendChild(li);
    });
}

function updateInstructorFilter() {
    const select = document.getElementById('instructorFilter');
    const currentVal = select.value;

    // Collect all instructors
    const instructors = new Set();
    appState.cohorts.forEach(c => {
        c.curriculum.forEach(item => instructors.add(item.instructor));
    });

    select.innerHTML = '<option value="all">모든 강사 보기</option>';
    [...instructors].sort().forEach(inst => {
        const option = document.createElement('option');
        option.value = inst;
        option.textContent = inst;
        select.appendChild(option);
    });

    select.value = currentVal;
}

function renderScheduler() {
    const tableHead = document.getElementById('schedulerHeaderRow');
    const tableBody = document.getElementById('schedulerBody');
    const filterInstructor = document.getElementById('instructorFilter').value;

    // Clear previous
    // Keep the first th (Date)
    while (tableHead.children.length > 1) {
        tableHead.removeChild(tableHead.lastChild);
    }
    tableBody.innerHTML = '';

    if (appState.cohorts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" class="p-8 text-center text-gray-400">데이터가 없습니다.</td></tr>';
        return;
    }

    // 1. Determine Date Range (Min Start to Max End)
    let minDate = null;
    let maxDate = null;
    let hasGlobalConflict = false;

    appState.cohorts.forEach(c => {
        if (!c.processedSchedule.length) return;
        const start = c.processedSchedule[0].date;
        const end = c.processedSchedule[c.processedSchedule.length - 1].date;

        if (!minDate || start < minDate) minDate = start;
        if (!maxDate || end > maxDate) maxDate = end;
    });

    if (!minDate) return;

    // 2. Build Header (Cohorts)
    appState.cohorts.forEach(c => {
        const th = document.createElement('th');
        th.className = 'p-3 text-center text-xs font-medium uppercase tracking-wider border-b border-gray-700 min-w-[150px]';
        th.textContent = c.name;
        tableHead.appendChild(th);
    });

    // 3. Build Rows (Dates)
    let curr = minDate;
    while (curr <= maxDate) {
        const tr = document.createElement('tr');
        const dayName = getDayName(curr);
        const isWknd = isWeekend(curr);
        const holidayName = getHolidayName(curr);

        // Date Cell
        const dateTd = document.createElement('td');
        dateTd.className = 'px-2 text-xs font-mono border-r border-gray-200 bg-white sticky-col whitespace-nowrap';

        let dateHtml = `<span class="font-bold mr-1">${curr}</span><span class="text-gray-500">(${dayName})</span>`;
        if (holidayName) {
            dateTd.classList.add('holiday-date');
            dateHtml += ` <span class="text-[10px] ml-1 text-red-600">${holidayName}</span>`;
        } else if (isWknd) {
            dateTd.classList.add('weekend-date');
        }
        dateTd.innerHTML = dateHtml;
        tr.appendChild(dateTd);

        // Check for conflicts on this date
        const instructorCounts = {};
        let rowHasConflict = false;
        appState.cohorts.forEach(c => {
            const schedule = c.processedSchedule.find(s => s.date === curr);
            if (schedule) {
                instructorCounts[schedule.instructor] = (instructorCounts[schedule.instructor] || 0) + 1;
            }
        });

        // Cohort Cells
        appState.cohorts.forEach(c => {
            const td = document.createElement('td');
            td.className = 'px-1 text-center text-xs border-r border-gray-100';

            const schedule = c.processedSchedule.find(s => s.date === curr);

            if (schedule) {
                // Filter check
                if (filterInstructor !== 'all' && schedule.instructor !== filterInstructor) {
                    td.className += ' bg-gray-50 opacity-30'; // Dim irrelevant
                } else {
                    // Content - Compact Single Line
                    td.innerHTML = `
                        <div class="rounded px-1.5 py-0.5 ${schedule.color} shadow-sm border border-black/5 flex items-center gap-1 justify-between h-full w-full overflow-hidden">
                            <span class="font-bold truncate flex-1 text-left">${schedule.subject}</span>
                            <span class="text-[10px] opacity-80 whitespace-nowrap">${schedule.instructor}</span>
                        </div>
                    `;

                    // Conflict Check
                    if (instructorCounts[schedule.instructor] > 1) {
                        td.querySelector('div').classList.add('conflict-cell');
                        hasGlobalConflict = true;
                        rowHasConflict = true;
                    }
                }
            } else {
                // Empty day (holiday or weekend or gap)
                if (holidayName || isWknd) {
                    td.className += ' bg-gray-50'; // Dim holidays/weekends
                }
            }
            tr.appendChild(td);
        });

        if (rowHasConflict) {
            tr.classList.add('conflict-row');
        }

        tableBody.appendChild(tr);
        curr = addDays(curr, 1);
    }

    // Toggle Global Alert
    const alertBox = document.getElementById('globalConflictAlert');
    if (hasGlobalConflict) {
        alertBox.classList.remove('hidden');
        document.getElementById('conflictMessage').textContent = '중복된 강사 배정이 발견되었습니다. 빨간색으로 표시된 항목을 확인하세요.';
    } else {
        alertBox.classList.add('hidden');
    }
}

function exportToExcel() {
    if (appState.cohorts.length === 0) return alert('내보낼 데이터가 없습니다.');

    const wb = XLSX.utils.book_new();
    const wsData = [];

    // Header
    const header = ['날짜', '요일', '휴일여부', ...appState.cohorts.map(c => c.name)];
    wsData.push(header);

    // Data
    const tableBody = document.getElementById('schedulerBody');
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(tr => {
        const rowData = [];
        const dateCell = tr.querySelector('td:first-child');
        const dateText = dateCell.querySelector('.font-bold').textContent.split(' ')[0]; // YYYY-MM-DD
        const dayText = dateCell.querySelector('.font-bold').textContent.split(' ')[1].replace(/[()]/g, '');
        const holidayText = dateCell.querySelector('.text-\\[10px\\]')?.textContent || '';

        rowData.push(dateText);
        rowData.push(dayText);
        rowData.push(holidayText);

        // Cohort cells
        const cohortCells = Array.from(tr.querySelectorAll('td')).slice(1);
        cohortCells.forEach(td => {
            const div = td.querySelector('div');
            if (div) {
                const subject = div.querySelector('.font-bold').textContent;
                const instructor = div.querySelector('.text-\\[10px\\]').textContent;
                rowData.push(`${subject} (${instructor})`);
            } else {
                rowData.push('');
            }
        });

        wsData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "통합일정");
    XLSX.writeFile(wb, "유비온_K-Digital_통합일정.xlsx");
}

// Make functions global for inline HTML calls
window.cloneCohort = cloneCohort;
window.deleteCohort = deleteCohort;
