window.userCache = {};
var mly = null, routeComponent, routeMarker;


var mapillary = {
    client_id: "Z0l2SnYzeXRIRDBpeC1xUWNTYTdqQTpiMzFiNTBiMWFkNWJkOWVl",
    client_secret: "ZTFmYmUwZDdmYjcwODM3ZTVjNmI5MzI5MzMyOTE1MDc=",
    base_url: "https://a.mapillary.com/v3/"
};


window.searchMplImages = function(latLngBounds, link){
  console.log("finding by bounds");
	var clearLayers = false;

	if(link==null){
		$("#chargingDialog").modal('show');
		// bbox minx,miny,maxx,maxy
	    var bbox = [latLngBounds.getWest(), latLngBounds.getNorth(), latLngBounds.getEast(), latLngBounds.getSouth()];
		link = mapillary.base_url + "/images?" + "bbox=" + bbox + "&client_id=" + mapillary.client_id;
		clearLayers = true;
	}

	$.get( link ).done(function(result, textStatus, jqXHR){
		window.addMplData(result, clearLayers);

		var linksHeaders = jqXHR.getResponseHeader("link").split(",");
        for(i = 0; i < linksHeaders.length; i++){
            if(linksHeaders[i].includes("rel=\"next")){
                var regex = /http.*>;/i.exec(linksHeaders[i]);
                var next_link = regex[0].slice(0,regex[0].length-2);

				window.searchMplImages(latLngBounds, next_link);
                break;
            }else if(i==linksHeaders.length-1){
				$("#chargingDialog").modal('hide');
            }
        }
	}).fail(function(err){
		console.log("Error looking in mapillary", err);
	})
};


window.buildMplViewer = function(imageKey){
    console.log("creating viewer",imageKey);

    window.map.closePopup();

    if($("#mly").length==0){
        $("#container").append("<div id='mly' width='0'></div>");
    }

    if(mly == null){
        var viewerOptions = {
            component: {
                cover: false
            }
        };

        mly = new Mapillary.Viewer(
            'mly',
            mapillary.client_id,
            imageKey,
            viewerOptions);

        // leaflet marker follow
        mly.on(Mapillary.Viewer.nodechanged, function (node) {
            var latLon = [node.latLon.lat, node.latLon.lon];

            if (!routeMarker) {
                routeMarker = L.marker(latLon);
                routeMarker.addTo(window.map);
            } else {
                routeMarker.setLatLng(latLon);
            }

            window.map.setZoom(17);
            window.map.setView(latLon);
        });
    }else{
        mly.moveToKey(imageKey);
    }

    showViewer();
    $("#buttonCloseMplViewer").removeClass("hidden");
};


function showViewer(){
    $("#map").css("width", "30%");
    $("#mly").css("width", "70%");
    $("body").css("padding-top", "66px");

    window.map.invalidateSize(true);
}


window.stopViewer = function(){
    $("#map").css("width", "100%");
    $("#mly").css("width", "0px");
    $("body").css("padding-top", "50px");

    $("#mly").remove();
    mly = null;

    window.map.invalidateSize(true);
    window.map.removeLayer(routeMarker);
    routeMarker = null;

    $("#buttonCloseMplViewer").addClass("hidden");
};
