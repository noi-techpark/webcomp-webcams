// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import L from 'leaflet';
import leaflet_mrkcls from 'leaflet.markercluster';
import style__leaflet from 'leaflet/dist/leaflet.css';
import style__markercluster from 'leaflet.markercluster/dist/MarkerCluster.css';
import style from './css/main.css';
import { fetchWebcams } from './api/api.js';

delete L.Icon.Default.prototype._getIconUrl;

class OpendatahubWebcams extends HTMLElement {
    constructor() {
        super();

         /* Map configuration */
        this.map_center = [46.479, 11.331];
        this.map_zoom = 9;
        this.map_layer = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png";
        this.map_attribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>';

        /* Requests */
        this.fetchWebcams = fetchWebcams.bind(this);

        // We need an encapsulation of our component to not
        // interfer with the host, nor be vulnerable to outside
        // changes --> Solution = SHADOW DOM
        this.shadow = this.attachShadow(
            {mode: "open"}    // Set mode to "open", to have access to
                              // the shadow dom from inside this component
        );
    }

    // Attributes we care about getting values from
    // Static, because all OpendatahubWebcams instances have the same
    //   observed attribute names
    static get observedAttributes() {
        return ['title'];
    }

    // Override from HTMLElement
    // Do not use setters here, because you might end up with an endless loop
    attributeChangedCallback(propName, oldValue, newValue) {
        console.log(`Changing "${propName}" from "${oldValue}" to "${newValue}"`);
        if (propName === "title") {
            this.render();
        }
    }

    // We should better use such getters and setters and not
    // internal variables for that to avoid the risk of an
    // endless loop and to have attributes in the html tag and
    // Javascript properties always in-sync.
    get title() {
        return this.getAttribute("title");
    }

    set title(newTitle) {
        this.setAttribute("title", newTitle)
    }

    // Triggers when the element is added to the document *and*
    // becomes part of the page itself (not just a child of a detached DOM)
    connectedCallback() {
        this.render();
        this.initializeMap();
        this.callApi();
    }

    async initializeMap() {
        let root = this.shadowRoot;
        let mapref = root.getElementById('map');
    
        this.map = L.map(mapref, { 
          zoomControl: false 
        }).setView(this.map_center, this.map_zoom);
    
        L.tileLayer(this.map_layer, {
          attribution: this.map_attribution
        }).addTo(this.map);
    }

    //Api call
    async callApi(){
        await this.fetchWebcams('');

        console.log('api gibbmer');
        console.log(this.webcams);
    }


    render() {
        this.shadow.innerHTML = `
            <style>
                ${style__markercluster}
                ${style__leaflet}
                ${style}
            </style>
            <h1>
                ${this.title}
            </h1>
            <div id="map" class="map"></div>
        `;
    }
}

// Register our first Custom Element named <hello-world>
customElements.define('webcomp-webcams', OpendatahubWebcams);
