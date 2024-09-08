// ==UserScript==
// @name         Leitstellenspiel Ausrücke-Verzögerung für einzelne Wache
// @namespace    https://www.leitstellenspiel.de/
// @version      3.1
// @description  Zeigt Fahrzeuge der aktuellen Wache und ermöglicht die Konfiguration der Ausrückverzögerungen für diese Fahrzeuge (Rechtes Menü mit Scrollfunktion).
// @author       Hudnur111 - IBoy - Coding Crew Tag 1
// @match        https://www.leitstellenspiel.de/buildings/*
// @icon         https://cdn-icons-png.flaticon.com/512/3135/3135715.png
// @license      GPL-3.0-or-later
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Betatester: m7e

(function() {
    'use strict';

    // Skriptinformationen
    const SCRIPT_NAME = 'Leitstellenspiel Ausrücke-Verzögerung für einzelne Wache';
    const CURRENT_VERSION = '3.1';
    const UPDATE_URL = 'https://github.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge.user.js/raw/main/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge.user.js';
    const VERSION_URL = 'https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/version.txt';

    // Überprüft, ob es eine neue Version gibt
    function checkForUpdate() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: VERSION_URL,
            onload: function(response) {
                if (response.status === 200) {
                    const latestVersion = response.responseText.trim();
                    if (latestVersion !== CURRENT_VERSION) {
                        notifyUserForUpdate(latestVersion);
                    }
                } else {
                    console.error('Fehler beim Abrufen der Versionsinformationen:', response.statusText);
                }
            },
            onerror: function() {
                console.error('Fehler beim Abrufen der Versionsinformationen.');
            }
        });
    }

    // Benachrichtigt den Benutzer über ein verfügbares Update
    function notifyUserForUpdate(latestVersion) {
        GM_notification({
            text: `${SCRIPT_NAME} (Version ${latestVersion}) Jetzt aktualisieren!`,
            title: 'Neue Version verfügbar',
            onclick: function() {
                window.open(UPDATE_URL, '_blank');
            }
        });
    }

    // Funktion, um Fahrzeuge der aktuellen Wache zu laden
    async function loadFahrzeuge() {
        const wacheId = window.location.pathname.split('/')[2];

        try {
            const response = await fetch(`/api/buildings/${wacheId}/vehicles`);
            if (!response.ok) throw new Error(`Fehler beim Abrufen der Fahrzeuge: ${response.statusText}`);

            const fahrzeuge = await response.json();
            if (!Array.isArray(fahrzeuge) || fahrzeuge.length === 0) {
                console.error('Keine Fahrzeuge für diese Wache gefunden oder API-Antwort ungültig.');
                return;
            }

            fahrzeuge.sort((a, b) => a.vehicle_type_caption.localeCompare(b.vehicle_type_caption));
            createSidebar(fahrzeuge);
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeuge:', error);
        }
    }

    // Funktion zur Erstellung des Buttons und der Sidebar
    function createSidebar(fahrzeuge) {
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = '🚒 Fahrzeugeinstellungen';
        toggleButton.style.position = 'fixed';
        toggleButton.style.bottom = '20px';
        toggleButton.style.right = '20px';
        toggleButton.style.zIndex = '1000';
        toggleButton.style.backgroundColor = '#007bff';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.padding = '10px 20px';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        toggleButton.style.cursor = 'pointer';
        document.body.appendChild(toggleButton);

        const sidebar = document.createElement('div');
        sidebar.id = 'vehicleSidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.top = '100px';
        sidebar.style.right = '10px';
        sidebar.style.width = '350px';
        sidebar.style.height = '400px';
        sidebar.style.overflowY = 'auto';
        sidebar.style.backgroundColor = '#f8f9fa';
        sidebar.style.border = '1px solid #ccc';
        sidebar.style.padding = '20px';
        sidebar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        sidebar.style.zIndex = '1000';
        sidebar.style.display = 'none'; // Start hidden
        sidebar.innerHTML = `
            <h4>Fahrzeug-Ausfahr-Verzögerung</h4>
            <div id="fahrzeugVerzögerungList"></div>
            <button class="btn btn-primary" id="saveDelays" style="margin-top: 10px;">Speichern</button>
            <span id="saveFeedback" class="text-success" style="display:none; margin-top: 10px;">Verzögerungen erfolgreich gespeichert!</span>
        `;
        document.body.appendChild(sidebar);

        const fahrzeugList = document.getElementById('fahrzeugVerzögerungList');

        fahrzeuge.forEach(fz => {
            const fzItem = document.createElement('div');
            fzItem.className = 'form-group';
            fzItem.innerHTML = `
                <label>${fz.vehicle_type_caption || fz.caption || 'Unbekanntes Fahrzeug'}</label>
                <input type="number" class="form-control delayInput" id="fz-${fz.id}" placeholder="Verzögerung in Sekunden" value="${getVerzögerung(fz.id)}">
            `;
            fahrzeugList.appendChild(fzItem);

            // Debugging: Ausgabe der Verzögerungen
            console.log(`Fahrzeug ID ${fz.id}: ${getVerzögerung(fz.id)}`);
        });

        document.getElementById('saveDelays').addEventListener('click', () => {
            saveDelays(fahrzeuge);
        });

        toggleButton.addEventListener('click', () => {
            sidebar.style.display = (sidebar.style.display === 'none') ? 'block' : 'none';
        });

        // Ermögliche das Speichern durch Drücken der Enter-Taste
        document.querySelectorAll('.delayInput').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveDelays(fahrzeuge);
                }
            });
        });
    }

    function saveDelays(fahrzeuge) {
        fahrzeuge.forEach(fz => {
            const delay = document.getElementById(`fz-${fz.id}`).value;
            console.log(`Speichern: Fahrzeug ID ${fz.id}, Verzögerung ${delay}`); // Debugging
            setVerzögerung(fz.id, delay);
        });
        document.getElementById('saveFeedback').style.display = 'inline';
        setTimeout(() => {
            document.getElementById('saveFeedback').style.display = 'none';
        }, 2000);
    }

    function getVerzögerung(fahrzeugId) {
        const delay = localStorage.getItem(`verzögerung-${fahrzeugId}`) || 0;
        console.log(`Verzögerung für Fahrzeug ID ${fahrzeugId}: ${delay}`); // Debugging
        return delay;
    }

    function setVerzögerung(fahrzeugId, delay) {
        localStorage.setItem(`verzögerung-${fahrzeugId}`, delay);
    }

    GM_addStyle(`
        #vehicleSidebar input {
            margin-bottom: 10px;
        }
        .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
            padding: 8px 16px;
            color: white;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #004085;
        }
        .form-group {
            margin-bottom: 15px;
        }
        .form-group label {
            display: block;
            font-weight: bold;
        }
        .form-group input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
    `);

    checkForUpdate(); // Check for updates when script is loaded
    loadFahrzeuge(); // Initialize the script when the page is loaded
})();
