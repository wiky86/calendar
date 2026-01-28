/**
 * Google Sheets Integration Logic
 */

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize Google API
function gapiLoaded() {
    gapi.load('client', intializeGapiClient);
}

async function intializeGapiClient() {
    // We don't initialize with API key here immediately because it might be empty
    // We'll do it before requests
    gapiInited = true;
}

function gisLoaded() {
    // We'll initialize token client when needed because we need the Client ID
    gisInited = true;
}

// Set callbacks for the script tags
document.getElementById('gapi-script').onload = gapiLoaded;
document.getElementById('gis-script').onload = gisLoaded;

async function handleGoogleSync() {
    if (!appState.googleConfig.clientId) {
        alert('설정(톱니바퀴 아이콘)에서 Client ID를 입력해주세요.');
        return;
    }

    if (!gapiInited || !gisInited) {
        alert('Google API가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    // Initialize Token Client if not already
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: appState.googleConfig.clientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: '', // defined later
        });
    }

    // Request Access Token
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        await syncDataToSheet();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when there's no session state.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

async function syncDataToSheet() {
    try {
        await gapi.client.init({
            apiKey: appState.googleConfig.apiKey,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        });

        const spreadsheetId = appState.googleConfig.sheetId;
        const range = 'Sheet1!A1'; // Start from A1

        // Prepare Data
        const data = [];
        // Header
        const header = ['날짜', '요일', '휴일여부', ...appState.cohorts.map(c => c.name)];
        data.push(header);

        // Body (Re-using logic from exportToExcel somewhat, but we need raw data)
        // Let's reconstruct the table data from appState

        // 1. Determine Date Range
        let minDate = null;
        let maxDate = null;
        appState.cohorts.forEach(c => {
            if (!c.processedSchedule.length) return;
            const start = c.processedSchedule[0].date;
            const end = c.processedSchedule[c.processedSchedule.length - 1].date;
            if (!minDate || start < minDate) minDate = start;
            if (!maxDate || end > maxDate) maxDate = end;
        });

        if (minDate) {
            let curr = minDate;
            while (curr <= maxDate) {
                const row = [];
                const dayName = getDayName(curr);
                const holidayName = getHolidayName(curr) || '';

                row.push(curr);
                row.push(dayName);
                row.push(holidayName);

                appState.cohorts.forEach(c => {
                    const schedule = c.processedSchedule.find(s => s.date === curr);
                    if (schedule) {
                        row.push(`${schedule.subject} (${schedule.instructor})`);
                    } else {
                        row.push('');
                    }
                });

                data.push(row);
                curr = addDays(curr, 1);
            }
        }

        const body = {
            values: data
        };

        // Clear sheet first (optional, but good to avoid leftovers)
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1',
        });

        // Write new data
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: body,
        });

        alert('구글 시트에 성공적으로 저장되었습니다!');

    } catch (err) {
        console.error(err);
        alert('동기화 중 오류가 발생했습니다: ' + err.message);
    }
}
