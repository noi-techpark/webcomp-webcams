// SPDX-FileCopyrightText: NOI Techpark <digital@noi.bz.it>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import L, { latLng } from 'leaflet';
import leaflet_mrkcls from 'leaflet.markercluster';
import style__leaflet from 'leaflet/dist/leaflet.css';
import style__markercluster from 'leaflet.markercluster/dist/MarkerCluster.css';
import style from './scss/main.scss';
import style__autocomplete from './scss/autocomplete.css';
import { fetchWebcams, fetchDistricts } from './api/api.js';
import { autocomplete } from './custom/autocomplete.js'

//delete L.Icon.Default.prototype._getIconUrl;

// Map pin (viewBox 0 0 32 42) filled with currentColor, plus a white glyph
const PIN_PATH = 'M16 0C7.2 0 0 7 0 15.7c0 11.2 14.1 25 15 25.9a1.4 1.4 0 0 0 2 0C17.9 40.7 32 26.9 32 15.7 32 7 24.8 0 16 0z';
const webcamPinSvg = '<svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="' + PIN_PATH + '" fill="currentColor"/>' +
    '<rect x="7.5" y="10.5" width="12" height="10" rx="2" fill="#fff"/><path d="M20.5 14.2l4-2.7v8l-4-2.7z" fill="#fff"/></svg>';
const searchPinSvg = '<svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="' + PIN_PATH + '" fill="currentColor"/>' +
    '<circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';
const searchIconSvg = '<svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

class OpendatahubWebcams extends HTMLElement {
    constructor() {
        super();         

        this.map_center = [46.7728692,10.7916716];
        this.map_zoom = 10;

        if(this.centermap != null)
        {
            var centerlatlong = this.centermap.split(',')
            /* Map configuration */
            this.map_center = [centerlatlong[0], centerlatlong[1]];
        }
        if(this.map_zoom != null)
        {
            this.map_zoom = this.zoommap;
        }
        //this.map_layer = "https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png";
        this.map_layer = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";        
        this.map_attribution = '<a target="_blank" href="https://opendatahub.com">OpenDataHub.com</a> | &copy; <a target="_blank" href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a target="_blank" href="https://carto.com/attribution">CARTO</a>';

        /* Requests */
        this.fetchWebcams = fetchWebcams.bind(this);
        this.fetchDistricts = fetchDistricts.bind(this);
        this.autocomplete = autocomplete.bind(this);

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
        return ['centermap','zoom','source'];
    }

    // Override from HTMLElement
    // Do not use setters here, because you might end up with an endless loop
    attributeChangedCallback(propName, oldValue, newValue) {
        console.log(`Changing "${propName}" from "${oldValue}" to "${newValue}"`);
        if (propName === "centermap" || propName === "zoommap" || propName === "source") {
            this.render();
        }
    }

    // We should better use such getters and setters and not
    // internal variables for that to avoid the risk of an
    // endless loop and to have attributes in the html tag and
    // Javascript properties always in-sync.
    get centermap() {
        return this.getAttribute("centermap");
    }
    set centermap(newCentermap) {
        this.setAttribute("centermap", newTitle)
    }

    get zoommap() {
        return this.getAttribute("zoommap");
    }
    set zoommap(newZoommap) {
        this.setAttribute("zoommap", newZoommap)
    }

    get source() {
        return this.getAttribute("source");
    }
    set source(newSource) {
        this.setAttribute("source", newSource)
    }

    // Triggers when the element is added to the document *and*
    // becomes part of the page itself (not just a child of a detached DOM)
    connectedCallback() {
        this.render();

        this.initializeMap();
        this.callApiDrawMap();
        this.addSearchInput();
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

        L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    }

    //Api call
    async addSearchInput(){
       
        let root = this.shadowRoot;
        let searchref = root.getElementById('searchInput');
        let hiddenref = root.getElementById('searchHidden');
          
        await this.fetchDistricts('Detail.de.Title,GpsPoints.position');    
        const mydistricts = this.districts;
        const mymap = this.map;

        this.autocomplete(searchref, hiddenref, mydistricts, this.shadowRoot);
       
        // searchref.addEventListener("click", (event) => {
        //     console.log(searchref.value);
        // });

        hiddenref.addEventListener("change", function(event) {
           
                let result = mydistricts.find(o => o['Detail.de.Title'] === searchref.value);

                //console.log(result);

                //console.log(result["GpsPoints.position"].Latitude);

                //center the map and zoom
                if(result){                    
                    const newgps = [result["GpsPoints.position"].Latitude, result["GpsPoints.position"].Longitude];
                    
                    // let markericon = L.icon({
                    //     iconUrl: 'map_marker.png',
                    //     iconSize: L.point(22, 40)
                    // });            
                    
                    let markericon = L.divIcon({
                        html: '<div class="search-marker">' + searchPinSvg + '</div>',
                        iconSize: L.point(32, 42),
                        iconAnchor: L.point(16, 42)
                      });

                    //var newMarker = new L.marker(newgps, { icon: markericon }).addTo(mymap);
                    var newMarker = new L.marker(newgps, { icon: markericon }).addTo(mymap);

                    mymap.flyTo(newgps, 13);

                }            
        });
    }    

    async callApiDrawMap() {
        await this.fetchWebcams(this.source);
        let columns_layer_array = [];
    
        this.webcams.map(webcam => {
              
            if(webcam.GpsPoints.position && webcam.GpsPoints.position.Latitude.Latitude != 0 && webcam.GpsPoints.position.Longitude != 0)
            {
                const pos = [
                    webcam.GpsPoints.position.Latitude, 
                    webcam.GpsPoints.position.Longitude
                ];
                    
                var webcamname = webcam.Shortname;

                if(webcamname == null)
                    webcamname = "no name";

                var imageurl = 'https://databrowser.opendatahub.com/img/noimage.png';

                if(webcam.ImageGallery && webcam.ImageGallery[0])
                    imageurl = webcam.ImageGallery[0].ImageUrl;


                const webcamhtml = '<img class="webcampreview" src="' + escapeHtml(imageurl) + '" alt="' + escapeHtml(webcamname) + '" loading="lazy">'

                let icon = L.divIcon({
                    html: '<div class="webcam-marker">' + webcamPinSvg + '</div>',
                    iconSize: L.point(32, 42),
                    iconAnchor: L.point(16, 42),
                    popupAnchor: L.point(0, -40)
                });
            
                //   let popupCont = '<div class="popup"><b>' + webcam.Shortname + '</b><br /><i>' + webcam.Id + '</i>';
                //   popupCont += '<table>';
                //   Object.keys(station.smetadata).forEach(key => {
                //     let value = station.smetadata[key];
                //     if (value) {
                //       popupCont += '<tr>';
                //       popupCont += '<td>' + key + '</td>';
                //       if (value instanceof Object) {
                //         let act_value = value[this.language];
                //         if (typeof act_value === 'undefined') {
                //           act_value = value[this.language_default];
                //         } 
                //         if (typeof act_value === 'undefined') {
                //           act_value = '<pre style="background-color: lightgray">' + JSON.stringify(value, null, 2) + '</pre>';
                //         } 
                //         popupCont += '<td><div class="popupdiv">' + act_value + '</div></td>';
                //       } else {
                //         popupCont += '<td>' + value + '</td>';
                //       } 
                //       popupCont += '</tr>';
                //     }
                //   });
                //   popupCont += '</table></div>';

                var webcamurl = '';

                if(webcam.WebCamProperties.WebcamUrl)
                    webcamurl = webcam.WebCamProperties.WebcamUrl;
            
                const licenseholder = escapeHtml(webcam.LicenseInfo.LicenseHolder || '-');
                const source = escapeHtml(webcam._Meta.Source || '');
                const badge = source != '' ? '<span class="webcampopup__badge">' + source + '</span>' : '';
                const popupimage = webcamurl != ''
                    ? '<a class="webcampopup" href="' + escapeHtml(webcamurl) + '" target="_blank" rel="noopener">' + webcamhtml + badge + '</a>'
                    : '<div class="webcampopup">' + webcamhtml + badge + '</div>';
                const popupcta = webcamurl != ''
                    ? '<a class="webcampopup__cta" href="' + escapeHtml(webcamurl) + '" target="_blank" rel="noopener">Open webcam &rarr;</a>'
                    : '';
                const popupbody = popupimage + '<div class="webcampopuptext"><h3>' + escapeHtml(webcamname) + '</h3>' +
                    '<dl><dt>Provider</dt><dd><a href="' + licenseholder + '" target="_blank" rel="noopener">' + licenseholder + '</a></dd>' +
                    '<dt>Source</dt><dd>' + source + '</dd></dl>' + popupcta + '</div>';

                let popup = L.popup().setContent(popupbody);
            
                // specify popup options 
                var customOptions =
                    {
                    'minWidth': 300,
                    'maxWidth': 340,
                    'className': 'webcam-popup'
                    }

                let marker = L.marker(pos, {
                    icon: icon,
                }).bindPopup(popup, customOptions);
            
                columns_layer_array.push(marker);
            }
        });
    
        this.visibleStations = columns_layer_array.length;
        let columns_layer = L.layerGroup(columns_layer_array, {});
    
        /** Prepare the cluster group for station markers */
        this.layer_columns = new L.MarkerClusterGroup({
          showCoverageOnHover: false,
          chunkedLoading: true,
          iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            const size = count < 10 ? 34 : count < 100 ? 42 : 50;
            return L.divIcon({
              html: '<div class="marker-cluster">' + count + '</div>',
              iconSize: L.point(size, size)
            });
          }
        });
        /** Add maker layer in the cluster group */
        this.layer_columns.addLayer(columns_layer);
        /** Add the cluster group to the map */
        this.map.addLayer(this.layer_columns);

        // this.map.on('popupopen', function(e) {
        //     var px = map.project(e.target._popup._latlng); // find the pixel location on the map where the popup anchor is
        //     px.y -= e.target._popup._container.clientHeight/2; // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
        //     map.panTo(map.unproject(px),{animate: true}); // pan to new center
        // });
      }


    render() {
        this.shadow.innerHTML = `
            <style>
                ${style__markercluster}
                ${style__leaflet}
                ${style__autocomplete}
                ${style}
            </style>     
            <div id="webcomponents-map"> 
                <div class="autocomplete search">${searchIconSvg}<input id="searchInput" type="text" name="searchLocation" placeholder="Search a town or area…" autocomplete="off"></div>
                <input id="searchHidden" type="hidden">     
                <div id="map" class="map"></div>
            </div>
        `;
    }
}

// Register our first Custom Element named <webcomp-webcams>
customElements.define('webcomp-webcams', OpendatahubWebcams);
