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
                        html: '<div class="marker-pointer"><span class="iconMarkerMap"></span></div>',                        
                        iconSize: L.point(22, 40)
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


                const webcamhtml = '<img class="webcampreview" src="' + imageurl + '" title="' + webcamname + '">'

                let icon = L.divIcon({
                    //html: '<div class="marker">' + webcamhtml + '</div>',
                    html: '<div class="iconMarkerWebcam"></div>',
                    iconSize: L.point(100, 100)
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

                var webcamurl = 'webcamurl';

                if(webcam.WebCamProperties.WebcamUrl)
                    webcamurl = webcam.WebCamProperties.WebcamUrl;
            
                const popuplink = '<a href="' + webcamurl + '" target="_blank">' + webcamname + '</a><br />'
                const popupbody = '<div class="webcampopup"><a href="' + webcamurl + '" target="_blank">' + webcamhtml + '</a></div><div class="webcampopuptext"><h3>' + popuplink +
                '</h3><div><b>Provider:</b> <a href="' + webcam.LicenseInfo.LicenseHolder + '" target="_blank">' + webcam.LicenseInfo.LicenseHolder + '</a><br /><b>Source:</b> ' + webcam._Meta.Source + '<br /><br /></div></div>'

                let popup = L.popup().setContent(popupbody);
            
                // specify popup options 
                var customOptions =
                    {
                    'minWidth': '350',
                    'maxWidth': '450',
                    'border-radius': '0.75em',
                    'padding': '0px'
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
            return L.divIcon({
              html: '<div class="marker_cluster__marker">' + cluster.getChildCount() + '</div>',
              iconSize: L.point(100, 100)
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
                <div class="autocomplete" style="width:300px;"><input id="searchInput" type="text" name="myCountry" placeholder="Country"></div>
                <input id="searchHidden" type="hidden">     
                <div id="map" class="map"></div>
            </div>
        `;
    }
}

// Register our first Custom Element named <webcomp-webcams>
customElements.define('webcomp-webcams', OpendatahubWebcams);
