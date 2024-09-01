// ==UserScript==
// @name         Leitstellenspiel Ausrücke-Verzögerung der Fahrzeuge
// @namespace    https://www.leitstellenspiel.de/
// @version      1.1.0
// @description  Die Ausrücke-Verzögerung der Fahrzeuge ermöglicht es, die Zeitspanne zu definieren, die ein Fahrzeug benötigt, um nach einer Alarmierung aus der Wache auszurücken. Diese Funktion erlaubt eine realistischere Simulation des Einsatzgeschehens, indem sie die Reaktionszeiten der Fahrzeuge anpasst. Durch die Konfiguration der Verzögerungszeit können Einsatzleiter die Einsatzplanung optimieren und sicherstellen, dass die Disposition der Einheiten den tatsächlichen Gegebenheiten vor Ort besser entspricht.
// @author       Hudnur111 - IBoy - Coding Crew Tag 1
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_addStyle
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

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

            wachen.sort((a, b) => a.caption.localeCompare(b.caption));

            wachen.forEach(wache => {
                const wacheItem = document.createElement('li');
                wacheItem.innerHTML = `<a href="#">${wache.caption}</a>`;
                wacheItem.dataset.wacheName = wache.caption.toLowerCase();
                wacheItem.addEventListener('click', () => showFahrzeuge(wache.id, wache.caption));
                wachenMenu.appendChild(wacheItem);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Wachen:', error);
            alert('Wachen konnten nicht geladen werden.');
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
                await loadAlternativeVehicles(wacheId, wacheName);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Fahrzeuge:', error);
            alert(`Fahrzeuge konnten nicht geladen werden.`);
        }
    }

    // Lädt alternative Fahrzeugdaten, wenn die erste Anfrage fehlschlägt
    async function loadAlternativeVehicles(wacheId, wacheName) {
        try {
            const response = await fetch(`/api/buildings/${wacheId}`);
            if (!response.ok) throw new Error(`Fehler beim Abrufen alternativer Fahrzeugdaten: ${response.statusText}`);
            const wacheData = await response.json();
            if (wacheData && wacheData.vehicles && wacheData.vehicles.length > 0) {
                showFahrzeugeDetails(wacheName, wacheData.vehicles);
            } else {
                alert(`Keine Fahrzeuge für die Wache ${wacheName} gefunden.`);
            }
        } catch (error) {
            console.error('Fehler beim Laden der alternativen Fahrzeugdaten:', error);
            alert(`Alternative Fahrzeugdaten konnten nicht geladen werden.`);
        }
    }

    // Zeigt die Details der Fahrzeuge einer Wache in einem Modal an
    function showFahrzeugeDetails(wacheName, fahrzeuge) {
        fahrzeuge.sort((a, b) => a.vehicle_type_caption.localeCompare(b.vehicle_type_caption));

        const modal = createModal(wacheName, fahrzeuge);
        document.body.appendChild(modal);
        $(modal).modal('show');
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

    // Initialisierung des Skripts
    createMenu();

})();
