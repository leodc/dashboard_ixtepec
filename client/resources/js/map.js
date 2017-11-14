var map, layerControl, mplLayer, satLayer, inegiLayer, hospitalsLayer, legendControl;

var popupSizes = [320, 640, 1024, 2048];
var popupSize = popupSizes[0];

var popupMaxWidth, popupMaxHeight;

function showState(e){
  console.log("changing state view", e.target.value);

  $("#chargingDialog").modal('show');

  inegiLayer.clearLayers();
  hospitalsLayer.clearLayers();
  satLayer.clearLayers();
  mplLayer.clearLayers();

  // squares
  $.getJSON("resources/data/loc/" + e.target.value + ".geojson", function(geojson){
    inegiLayer.addData(geojson);
    map.fitBounds(inegiLayer.getBounds());
    window.searchMplImages(inegiLayer.getBounds());

    inegiLayer.bringToBack();
    hospitalsLayer.bringToFront();
    satLayer.bringToFront();
    mplLayer.bringToFront();

    // update legend
    var legend = {title: geojson.features[0].properties.nom_loc, pobtot: 0, vivtot: 0};
    for(var i = 0; i < geojson.features.length; i++){
      legend.pobtot += +geojson.features[i].properties.pobtot;
      legend.vivtot += +geojson.features[i].properties.vivtot;
    }

    legendControl.update(legend);
  });

  // hospitals
  $.getJSON("resources/data/loc/" + e.target.value + "_hospitals.geojson", function(geojson){
    hospitalsLayer.addData(geojson);
  });

  // sat images
  $.getJSON("/resources/data/loc/" + e.target.value + "_sat.geojson", function(data){
    satLayer.addData(data);

    var feature, centroid;
    for(var i = 0; i < data.features.length; i++){
      feature = data.features[i];
      centroid = turf.centroid(feature.geometry, feature.properties);

      satLayer.addData(centroid);
    }
  }).fail(function(err){
    console.log("No sat data for this location");
  });
}


function showOpenStreetCam(){
  var latLng = map.getCenter();
  var zoom = map.getZoom();

  var url = "http://www.openstreetcam.org/map/@" + latLng.lat + "," + latLng.lng + "," + zoom + "z";
  window.open(url);
}


function buildSatPopup(layer){
  var properties = layer.feature.properties;

  var content = "<b>" + layer.feature.properties + "</b><br>";
  content = '<div class="ba-slider"> \
  <img src="' + properties.pre + '" alt=""> \
  <div class="resize"> \
  <img src="' + properties.post + '" alt=""> \
  </div> \
  <span class="handle"></span> \
  </div>';

  return content;
}



function addMplData(featureCollection, clearLayers=false){
  console.log("Adding mply data");
  mplLayer.addData(featureCollection);
}


function buildPopup(layer){
  var properties = layer.feature.properties;
  var clientId = "dmMtOThHZkp6TzdwYW1qaFZLc1J3UTpiZTlkYjUwMjc3NmMzNGI1";
  var embedUrl = "https://embed-v1.mapillary.com/embed?show_segmentation=false&version=1&filter=%5B%22all%22%5D&map_filter=%5B%22all%22%5D&image_key=" + properties.key + "&client_id=" + clientId + "&style=photo";
  var linkUrl = "http://mapillary.com/map/im/" + properties.key;
  return "<div style='overflow: hidden;' ><iframe width=\"480\" height=\"320\" src=\"" + embedUrl + "\" frameborder=\"0\"></iframe><br><button style=\"float:right;background-color: #4CAF50;border: none;color: white;padding: 5px 11px;text-align: center;text-decoration: none;display: inline-block;font-size: 12px;\" onclick=\"window.open('" + linkUrl + "','_blank','resizable=yes')\">Open in Mapillary</button></div>"
}


function buildStyle(feature){
  return {color: "green"};
}


function initMap(id){
  /* Basemap Layers */
  var osm = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  });

  // mapbox satellite streets
  var mapboxSatelliteTiles = L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW1sZW8iLCJhIjoiT0tfdlBSVSJ9.Qqzb4uGRSDRSGqZlV6koGg",{
    attribution: 'Repubikla | Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, Tiles thanks to © <a href="http://mapbox.com">Mapbox</a>'
  });

  map = L.map(id, {
    center: [20,0],
    zoom: 3,
    minZoom: 3,
    maxZoom: 18,
    layers: mapboxSatelliteTiles
  });

  mplLayer = L.geoJSON([], {
    style: buildStyle,
    pointToLayer: function(geojsonPoint, latLng){
      return L.circleMarker(latLng, {radius:2})
    }
  }).bindPopup(buildPopup, {maxWidth: popupSize*2}).addTo(map);

  // locate
  var locateControl = L.control.locate({
    strings: {
      title: "Encuéntrame",
      popup: ""
    },
    icon: "fa fa-location-arrow"
  });

  map.addControl(locateControl);

  L.easyButton({
    states:[{
      icon: "fa fa-window-restore",
      title: "Mostrar OpenStreetCam",
      onClick: showOpenStreetCam
    }]}).addTo(map);

    // resize control
    $(window).resize(function() {
      map.invalidateSize();
    });

    inegiLayer = L.geoJSON(null, {
      style: function(feature){
        return {
          weight: 1,
          fillColor: feature.properties.color,
          fillOpacity: 1,
          color: "white"
        };
      }
    }).bindTooltip(function(layer){
      var popupContent = "";
      // total de población
      popupContent += "Población en esta manzana: " + layer.feature.properties.pobtot + "<br>";

      // total de viviendas
      popupContent += "Viviendas en esta manzana: " + layer.feature.properties.vivtot + "<br>";

      return popupContent;
    }).addTo(map);

    hospitalsLayer = L.geoJSON(null, {
      pointToLayer: function(geojsonPoint, latLng){
        var marker = L.AwesomeMarkers.icon({
          prefix: "fa",
          icon: "medkit",
          markerColor: "blue",
          iconColor: "white"
        });

        return L.marker(latLng, {icon: marker});
      }
    }).bindTooltip(function(layer){
      var properties = layer.feature.properties;

      var popupContent = "<b>" + properties.nom_estab + "</b><br><br>";

      popupContent += "Actividad: " + properties.nombre_act + "<br>";
      popupContent += "Capacidad: " + properties.per_ocu

      if(properties.telefono){
        popupContent += "<br>Teléfono: " + properties.telefono
      }

      return popupContent;
    }).addTo(map);


    satLayer = L.geoJSON(null, {
      pointToLayer: function(geojsonPoint, latLng){
        var marker = L.AwesomeMarkers.icon({
          prefix: "fa",
          icon: "image",
          markerColor: "green",
          iconColor: "white"
        });

        return L.marker(latLng, {icon: marker});
      }
    }).bindPopup(buildSatPopup, {maxWidth: 1000, minWidth: 1000, maxHeight:1000, keepInView: true}).addTo(map);

    layerControl = L.control.layers({"OSM":osm, "Mapbox Satellite": mapboxSatelliteTiles}, {"Datos INEGI": inegiLayer, "Hospitales y Refugios": hospitalsLayer, "Mapillary": mplLayer, "Imágenes Satelitales": satLayer}, {collapsed: false}).addTo(map);



    // legend
    legendControl = L.control();

    legendControl.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();
      return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    legendControl.update = function (props) {
      console.log(props)

      var html = "";
      if(props){
        html = '<h4 id="legendTitle">' + props.title + '</h4>';

        html += "Población total: " + props.pobtot + "<br>";
        html += "Viviendas totales: " + props.vivtot + "<br>";
      }

      // html +=
      // (props ? '<b>' + props.name + '</b><br />' + props.density + ' people / mi<sup>2</sup>'
      //     : 'Hover over a state');

      this._div.innerHTML = html;
    };

    legendControl.addTo(map);
  }




  function buildMap(){
    popupMaxWidth = $("#map").width() - 200;
    popupMaxHeight = $("#map").height() - 200;


    initMap("map");

    map.on("popupopen", function(evt){
      $('.ba-slider').each(function(){
        var cur = $(this);
        // Adjust the slider
        var width = cur.width()+'px';
        cur.find('.resize img').css('width', width);
        // Bind dragging events
        drags(cur.find('.handle'), cur.find('.resize'), cur);
      });
    });


    // $("#chargingDialog").modal("hide");
    window.selectState("200430001");

    // $.get("/resources/data/loc/200140001.geojson", function(geojson){
    //     geojson = JSON.parse(geojson);
    //
    //     $.get("/resources/data/espinal.geojson", function(featuresData){
    //         featuresData = JSON.parse(featuresData);
    //         var data = {};
    //
    //         var feature, featureKey, dataKey;
    //         for(var i = 0; i < featuresData.features.length; i++){
    //             feature = featuresData.features[i];
    //             featureKey = feature.properties.entidad + feature.properties.mun + feature.properties.loc + feature.properties.ageb + feature.properties.mza;
    //
    //             data[featureKey] = feature.properties;
    //             data[featureKey].key = featureKey;
    //         }
    //
    //         var dataAux = [];
    //         for(var i = 0; i < geojson.features.length; i++){
    //             feature = geojson.features[i];
    //             featureKey = feature.properties.CVE_ENT + feature.properties.CVE_MUN + feature.properties.CVE_LOC + feature.properties.CVE_AGEB + feature.properties.CVE_MZA;
    //
    //             if(data[featureKey]){
    //                 feature.properties = data[featureKey];
    //                 dataAux.push(feature);
    //             }
    //         }
    //
    //         dataAux.sort(function(a,b){
    //             return b.properties.prom_ocup - a.properties.prom_ocup;
    //         });
    //         var colorsAux = palette('tol-sq', dataAux.length).reverse();
    //         for(var i = 0; i < dataAux.length; i++){
    //             dataAux[i].properties.color = "#" + colorsAux[i];
    //         }
    //
    //         auxLayer = L.geoJSON(dataAux, {
    //             style: function(feature){
    //                 return {
    //                     weight: 1,
    //                     fillColor: feature.properties.color,
    //                     fillOpacity: 1,
    //                     color: "white"
    //                 };
    //             }
    //         }).bindTooltip(function(layer){
    //             var popupContent = "";
    //             // total de población
    //             popupContent += "Total de población: " + layer.feature.properties.pobtot + "<br>";
    //
    //             // total de viviendas
    //             popupContent += "Total de viviendas: " + layer.feature.properties.vivtot + "<br>";
    //
    //             return popupContent;
    //         }).addTo(map);
    //
    //     });
    //
    // });
  }


  /*global $ L MQ*/
