// ==UserScript==
// @name         Leitstellenspiel Ausrücke-Verzögerung der Fahrzeuge
// @namespace    https://www.leitstellenspiel.de/
// @version      1.5
// @description  Die Ausrücke-Verzögerung der Fahrzeuge ermöglicht es, die Zeitspanne zu definieren, die ein Fahrzeug benötigt, um nach einer Alarmierung aus der Wache auszurücken. Diese Funktion erlaubt eine realistischere Simulation des Einsatzgeschehens, indem sie die Reaktionszeiten der Fahrzeuge anpasst. Durch die Konfiguration der Verzögerungszeit können Einsatzleiter die Einsatzplanung optimieren und sicherstellen, dass die Disposition der Einheiten den tatsächlichen Gegebenheiten vor Ort besser entspricht.
// @author       Hudnur111 - IBoy - Coding Crew Tag 1
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @license      GPL-3.0-or-later
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const SCRIPT_NAME = 'Leitstellenspiel Ausrücke-Verzögerung der Fahrzeuge';
    const CURRENT_VERSION = '1.5';
    const UPDATE_URL = 'https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/script.js';
    const VERSION_URL = 'https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/version.txt';

    function compareVersions(v1, v2) {
        const v1Parts = v1.split('.').map(Number);
        const v2Parts = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            if ((v1Parts[i] || 0) < (v2Parts[i] || 0)) return -1;
            if ((v1Parts[i] || 0) > (v2Parts[i] || 0)) return 1;
        }
        return 0;
    }

    function checkForUpdate() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: VERSION_URL,
            onload: function(response) {
                if (response.status === 200) {
                    const latestVersion = response.responseText.trim();
                    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                        notifyUserForUpdate(latestVersion);
                    }
                }
            },
            onerror: function() {
                console.error('Fehler beim Abrufen der Versionsinformationen.');
            }
        });
    }

    function notifyUserForUpdate(latestVersion) {
        GM_notification({
            text: `${SCRIPT_NAME} (Version ${latestVersion}) Jetzt Aktualisieren!`,
            title: 'Neue Version verfügbar',
            onclick: function() {
                window.open(UPDATE_URL, '_blank');
            }
        });
    }

    checkForUpdate();

    function createMenu() {
        const navbar = document.querySelector('.navbar-nav');
        if (!navbar || document.getElementById('ausrueckVerzoegerungMenu')) return;

        const li = document.createElement('li');
        li.id = 'ausrueckVerzoegerungMenu';
        li.className = 'dropdown';
        li.innerHTML = `
            <a href="#" class="dropdown-toggle" data-toggle="dropdown">Ausrückverzögerung <b class="caret"></b></a>
            <ul class="dropdown-menu" id="menuWachen" style="max-height: 400px; overflow-y: auto;">
                <li><input type="text" id="searchInput" class="form-control" placeholder="Wache suchen..."></li>
            </ul>
        `;
        navbar.appendChild(li);

        document.getElementById('searchInput').addEventListener('input', filterWachen);

        listWachen();
    }

    async function listWachen() {
        try {
            const wachenMenu = document.getElementById('menuWachen');
            if (!wachenMenu) return;

            const response = await fetch('/api/buildings');
            if (!response.ok) throw new Error(`Fehler beim Abrufen der Wachen: ${response.statusText}`);
            let wachen = await response.json();

            const excludedTypes = [6, 2, 20]; // 6: Krankenhaus, 2: Leitstelle, 20: Bereitschaftraum
            let filteredWachen = wachen.filter(wache => !excludedTypes.includes(parseInt(wache.building_type, 10)));

            if (filteredWachen.length === 0 && wachen.length > 0) {
                filteredWachen = wachen.filter(wache => wache.building_type && !excludedTypes.includes(parseInt(wache.building_type, 10)));
            }

            filteredWachen.sort((a, b) => a.caption.localeCompare(b.caption));

            filteredWachen.forEach(wache => {
                const wacheItem = document.createElement('li');
                wacheItem.innerHTML = `<a href="#">${wache.caption}</a>`;
                wacheItem.dataset.wacheName = wache.caption.toLowerCase();
                wacheItem.addEventListener('click', () => showFahrzeuge(wache.id, wache.caption));
                wachenMenu.appendChild(wacheItem);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Wachen:', error);
        }
    }

    function filterWachen() {
        const searchValue = document.getElementById('searchInput').value.toLowerCase();
        const wachenItems = document.querySelectorAll('#menuWachen li');

        wachenItems.forEach(item => {
            if (item.dataset.wacheName && item.dataset.wacheName.includes(searchValue)) {
                item.style.display = '';
            } else if (item.dataset.wacheName) {
                item.style.display = 'none';
            }
        });
    }

    async function showFahrzeuge(wacheId, wacheName) {
        try {
            const response = await fetch(`/api/buildings/${wacheId}/vehicles`);
            if (!response.ok) throw new Error(`Fehler beim Abrufen der Fahrzeuge: ${response.statusText}`);
            const fahrzeuge = await response.json();

            if (fahrzeuge && fahrzeuge.length > 0) {
                fahrzeuge.sort((a, b) => a.vehicle_type_caption.localeCompare(b.vehicle_type_caption));
                const modal = createModal(wacheName, fahrzeuge);
                document.body.appendChild(modal);
                $(modal).modal('show');
            } else {
                alert(`Keine Fahrzeuge für die Wache ${wacheName} gefunden.`);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeuge:', error);
        }
    }

    function createModal(wacheName, fahrzeuge) {
        const existingModal = document.querySelector('.modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal">&times;</button>
                        <h4 class="modal-title">Verzögerungen für Wache: ${wacheName}</h4>
                    </div>
                    <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
                        <form id="verzögerungsForm">
                            ${fahrzeuge.map(fz => `
                                <div class="form-group">
                                    <label>${fz.vehicle_type_caption || fz.caption || 'Unbekanntes Fahrzeug'}</label>
                                    <input type="number" class="form-control" id="fz-${fz.id}" placeholder="Verzögerung in Sekunden" value="${getVerzögerung(fz.id)}" min="0">
                                </div>`).join('')}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="saveVerzögerungen">Speichern</button>
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('#saveVerzögerungen').addEventListener('click', () => {
            fahrzeuge.forEach(fz => {
                const delay = modal.querySelector(`#fz-${fz.id}`).value;
                setVerzögerung(fz.id, delay);
            });
            $(modal).modal('hide');
        });

        return modal;
    }

    function getVerzögerung(fahrzeugId) {
        return localStorage.getItem(`verzögerung-${fahrzeugId}`) || 0;
    }

    function setVerzögerung(fahrzeugId, delay) {
        const delayValue = parseInt(delay, 10);
        if (isNaN(delayValue) || delayValue < 0) {
            alert("Bitte geben Sie eine gültige Verzögerung ein.");
            return;
        }
        localStorage.setItem(`verzögerung-${fahrzeugId}`, delayValue);
    }

    createMenu();
})();
