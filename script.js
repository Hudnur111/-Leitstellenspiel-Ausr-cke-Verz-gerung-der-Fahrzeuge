// ==UserScript==
// @name         Leitstellenspiel Ausrücke-Verzögerung der Fahrzeuge mit GitHub Auto-Update
// @namespace    https://www.leitstellenspiel.de/
// @version      1.2.4
// @description  Die Ausrücke-Verzögerung der Fahrzeuge ermöglicht es, die Zeitspanne zu definieren, die ein Fahrzeug benötigt, um nach einer Alarmierung aus der Wache auszurücken. Diese Funktion erlaubt eine realistischere Simulation des Einsatzgeschehens, indem sie die Reaktionszeiten der Fahrzeuge anpasst. Durch die Konfiguration der Verzögerungszeit können Einsatzleiter die Einsatzplanung optimieren und sicherstellen, dass die Disposition der Einheiten den tatsächlichen Gegebenheiten vor Ort besser entspricht. Zusätzlich wird das Skript regelmäßig auf Updates überprüft und bei Verfügbarkeit automatisch aktualisiert.
// @author       Hudnur111 - IBoy - Coding Crew Tag 1
// @match        https://www.leitstellenspiel.de/*
// @match        *://github.com/*/raw/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @license      GPL-3.0-or-later
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // URL zur neuesten Skriptversion und zum Skript
    const scriptUpdateUrl = 'https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/script.js'; 
    const scriptVersionUrl = 'https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/script-version.txt'; 
    const currentVersion = '1.2.4'; 

    // URL für das automatische Update des Skripts
    // Update-URL: https://raw.githubusercontent.com/Hudnur111/-Leitstellenspiel-Ausr-cke-Verz-gerung-der-Fahrzeuge/main/script.js

    // Funktion zur Überprüfung der Skriptversion
    function checkForUpdate() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: scriptVersionUrl,
            onload: function(response) {
                const latestVersion = response.responseText.trim();
                if (latestVersion !== currentVersion) {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: scriptUpdateUrl,
                        onload: function(updateResponse) {
                            GM_setValue('latest-script', updateResponse.responseText);
                            alert('Ein Update für das Skript ist verfügbar und wurde heruntergeladen. Bitte laden Sie die Seite neu.');
                        }
                    });
                }
            }
        });
    }

    // Überprüfen, ob die Skript-URL aktualisiert werden muss
    if (window.location.href.includes('/raw/')) {
        const tampermonkeyUrl = window.location.href.replace('/raw/', '/files/');
        GM_openInTab(tampermonkeyUrl, { active: true });
    } else {
        checkForUpdate();
        createMenu();
    }

    // Fügt benutzerdefiniertes CSS hinzu
    GM_addStyle(`
        /* Stil für das Dropdown-Menü */
        .navbar-nav .dropdown-menu {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.375rem;
            padding: 0.5rem;
        }
        .navbar-nav .dropdown-menu li a {
            color: #007bff;
            font-size: 1rem;
        }
        .navbar-nav .dropdown-menu li a:hover {
            background-color: #e9ecef;
        }

        /* Stil für das Suchfeld */
        #searchInput {
            border-radius: 0.375rem;
            border: 1px solid #ced4da;
            padding: 0.5rem;
        }

        /* Stil für das Modal */
        .modal-content {
            border-radius: 0.375rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
            background-color: #007bff;
            color: #ffffff;
            border-bottom: 1px solid #dee2e6;
        }
        .modal-title {
            font-size: 1.25rem;
            font-weight: 500;
        }
        .modal-body {
            padding: 1rem;
        }
        .modal-footer {
            border-top: 1px solid #dee2e6;
            padding: 0.75rem;
        }
        .modal-footer .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
        }
        .modal-footer .btn-primary:hover {
            background-color: #0056b3;
            border-color: #004085;
        }

        /* Stil für die Formular-Elemente */
        .form-group label {
            font-weight: 500;
        }
        .form-control {
            border-radius: 0.375rem;
            border: 1px solid #ced4da;
        }
    `);

    // Erstellt das Menü in der oberen Leiste
    function createMenu() {
        const navbar = document.querySelector('.navbar-nav');
        if (!navbar) return;

        const li = document.createElement('li');
        li.className = 'dropdown';
        li.innerHTML = `
            <a href="#" class="dropdown-toggle" data-toggle="dropdown">Ausrückverzögerung <b class="caret"></b></a>
            <ul class="dropdown-menu" id="wachenMenu" style="max-height: 400px; overflow-y: auto;">
                <li><input type="text" id="searchInput" class="form-control" placeholder="Wache suchen..."></li>
            </ul>
        `;
        navbar.appendChild(li);

        document.getElementById('searchInput').addEventListener('input', filterWachen);

        listWachen();
    }

    // Ruft die Liste der Wachen ab und zeigt sie an
    async function listWachen() {
        try {
            const wachenMenu = document.getElementById('wachenMenu');
            if (!wachenMenu) return;

            const response = await fetch('/api/buildings');
            if (!response.ok) throw new Error(`Fehler beim Abrufen der Wachen: ${response.statusText}`);
            const wachen = await response.json();

            const excludedTypes = [6, 2, 20];
            let filteredWachen = wachen.filter(wache => !excludedTypes.includes(parseInt(wache.building_type, 10)));

            if (filteredWachen.length === 0 && wachen.length > 0) {
                filteredWachen = wachen.filter(wache => wache.building_type && !excludedTypes.includes(wache.building_type));
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

    // Filtert die Wachen nach dem eingegebenen Suchbegriff
    function filterWachen() {
        const searchValue = document.getElementById('searchInput').value.toLowerCase();
        const wachenItems = document.querySelectorAll('#wachenMenu li');

        wachenItems.forEach(item => {
            if (item.dataset.wacheName && item.dataset.wacheName.includes(searchValue)) {
                item.style.display = '';
            } else if (item.dataset.wacheName) {
                item.style.display = 'none';
            }
        });
    }

    // Zeigt die Fahrzeuge einer ausgewählten Wache an und ermöglicht das Setzen der Verzögerung
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

    // Erstellt ein Modal für die Anzeige und Konfiguration der Fahrzeug-Verzögerungen
    function createModal(wacheName, fahrzeuge) {
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
                                    <input type="number" class="form-control" id="fz-${fz.id}" placeholder="Verzögerung in Sekunden" value="${getVerzögerung(fz.id)}">
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

    // Ruft die Verzögerungszeit eines Fahrzeugs aus dem lokalen Speicher ab
    function getVerzögerung(fahrzeugId) {
        return localStorage.getItem(`verzögerung-${fahrzeugId}`) || 0;
    }

    // Speichert die Verzögerungszeit eines Fahrzeugs im lokalen Speicher
    function setVerzögerung(fahrzeugId, delay) {
        localStorage.setItem(`verzögerung-${fahrzeugId}`, delay);
    }
})();
