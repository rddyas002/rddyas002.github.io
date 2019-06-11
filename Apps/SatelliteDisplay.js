Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5YzA4N2I4OC01NjBkLTRjYzUtOGI1Zi04MzM1OTg5ZTAzM2UiLCJpZCI6MTE1OTAsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NTkyODE0OTN9.zocE1MMKfFHbSdXTH0whvsZdf7aB-Bq2OnEjI0rCelI';

var bing = new Cesium.BingMapsImageryProvider({
    url : 'https://dev.virtualearth.net',
    key : 'f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a',
    mapStyle : Cesium.BingMapsStyle.AERIAL
});

var viewer = new Cesium.Viewer('cesiumContainer',{
	timeline: true,
	animation: true,
	shouldAnimate: true,
	homeButton: false,
	infoButton: false,
	navigationHelpButton: false,
	sceneModePicker: false,
	selectionIndicator: false,
	geocoder: false,
	baseLayerPicker: false,
	shadows: true,
	imageryProvider: bing,
	creditContainer: 'dummy'});
	
	
var scene = viewer.scene;
scene.globe.enableLighting = true;
scene.globe.depthTestAgainstTerrain = false;
scene.globe.showGroundAtmosphere = false;
scene.highDynamicRange = true;
scene.moon = new Cesium.Moon();
scene.sun = new Cesium.Sun();

clock_1 = viewer.clockViewModel.clock;
// stop clock
clock_1._shouldAnimate = false;
// default timeline view
viewer.animation.container.hidden = true;
viewer.timeline.container.hidden = true;
viewTimelineEnabled = false;

//Enable terrain
var terrainProvider = new Cesium.CesiumTerrainProvider({
    url: '//assets.agi.com/stk-terrain/world',
    requestWaterMask: true
});

viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(18.837977, 0, 25000000.0)
});

var ZA_AEROSAT = viewer.entities.add({
    id: "ZA_CUBESAT",
    name: "ZA_CUBESAT",
//    model: {
//        uri: 'Apps/CubeSpaceDemo/models/3U_4_low.gltf',
//        minimumPixelSize: 0.0,
//        show: true
//    },
    point: {
        color: Cesium.Color.RED,
        pixelSize: 5,
		outlineColor: Cesium.Color.WHITE,
		outlineWidth: 1
    }
});

// fetch ZA-AEROSAT tle
//const tle_url = 'https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/NORAD_CAT_ID/42713/orderby/TLE_LINE1 ASC/format/tle';

//$.get(tle_url, function(data, status){
//	console.log('${data}');
//});

var tleLine1 = '1 35870U 09049F   19156.73287745 +.00004529 +00000-0 +53228-4 0  9994',
    tleLine2 = '2 35870 097.0551 179.3831 0000486 036.3256 023.4528 15.61969621545089';

// Initialize a satellite record
var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

var ZA_AEROSAT_sampledPosition = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL, 0);
ZA_AEROSAT_sampledPosition.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
});
ZA_AEROSAT_sampledPosition.forwardExtrapolationDuration = 5;
ZA_AEROSAT.position = ZA_AEROSAT_sampledPosition;

// create orientation property
var ZA_AEROSAT_sampledOrientation = new Cesium.SampledProperty(Cesium.Quaternion);
ZA_AEROSAT_sampledOrientation.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
});
ZA_AEROSAT_sampledOrientation.forwardExtrapolationDuration = 5;
ZA_AEROSAT.orientation = ZA_AEROSAT_sampledOrientation;

setInterval(sgp4_propagate, 1000);

var start_counter = 0;
var g_pitch = 0;

function sgp4_propagate(){
	js_time = new Date();
	var jd_time = Cesium.JulianDate.fromDate(js_time);
	var positionAndVelocity = satellite.propagate(satrec, js_time);
	//console.log(positionAndVelocity.position);
    sat_position = new Cesium.Cartesian3(positionAndVelocity.position.x*1e3, positionAndVelocity.position.y*1e3, positionAndVelocity.position.z*1e3);
    sat_velocity = new Cesium.Cartesian3(positionAndVelocity.velocity.x, positionAndVelocity.velocity.y, positionAndVelocity.velocity.z);
	//console.log(sat_position + jd_time.dayNumber + jd_time.secondsOfDay);
    ZA_AEROSAT_sampledPosition.addSample(jd_time, sat_position);
	//var ori = new Cesium.VelocityOrientationProperty(ZA_AEROSAT_sampledPosition);
	heading = 0; 
	g_pitch = g_pitch - 0.1; 
	roll = 0;
	hpr = new Cesium.HeadingPitchRoll(heading, g_pitch, roll);
	qc = new Cesium.Quaternion.fromHeadingPitchRoll(hpr);
	ZA_AEROSAT_sampledOrientation.addSample(jd_time, qc);
	start_counter++;
	if (start_counter > 2 && start_counter < 5)
		clock_1._shouldAnimate = true;
}

viewer.clock.onTick.addEventListener(function(){
    //console.log('Hello world!');
});



//var socket = io();
//console.log('Socket created');

//var czmlDataSource = new Cesium.CzmlDataSource();
//socket.on('czml-test', function(msg){
//	var response = JSON.parse(msg);
//	czmlDataSource.process(response);
//	viewer.dataSources.add(czmlDataSource);
//	console.log('Received dummy data: ' + msg);
//   blueBox.position = Cesium.Cartesian3.fromDegrees(msg.lon, msg.lat, 30000.0);
//   model.position = Cesium.Cartesian3.fromDegrees(msg.lon, -33.963745, 30000.0);
//});

// handle keyboard shortcuts
// toggle model view
Mousetrap.bind('t', function (e) {
    if (viewTimelineEnabled) {
        viewer.animation.container.hidden = true
		//viewer.timeline.container.hidden = true
        viewTimelineEnabled = false;
    }
    else {
        viewer.animation.container.hidden = false
		//viewer.timeline.container.hidden = false
        viewTimelineEnabled = true;
    }
});
