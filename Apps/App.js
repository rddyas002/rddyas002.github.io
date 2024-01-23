Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NDRiOWRlZC1hMGNhLTQ4MTItYTc4Mi0xNDU2NDcwZGY4ODYiLCJpZCI6MTYwMDUyLCJpYXQiOjE2OTE4NTY2NDd9.2dR-_W79kbY5yxpTk8epVwacyMLx3xAjjBbLIOQy8rc';

var bing = new Cesium.BingMapsImageryProvider({
    url : 'https://dev.virtualearth.net',
    key : 'f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a',
    mapStyle : Cesium.BingMapsStyle.AERIAL
});

// setup scene
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

var home_lon = 18.837977;
var home_lat = 0;
// set camera origin
viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(home_lon, home_lat, 25000000.0)
});

image_viewer = new Cesium.Viewer('imageViewInside', {
	/*           imageryProvider: new Cesium.createTileMapServiceImageryProvider({
				   url: '/images/200407.3x86400x43200',
				   maximumLevel: 9,
				   credit: 'Imagery courtesy of NASA'
			   }),
   */
			   useDefaultRenderLoop: false,
			   timeline: false,
			   animation: false,
			   homeButton: false,
			   infoButton: false,
			   navigationHelpButton: false,
			   sceneModePicker: false,
			   selectionIndicator: false,
			   geocoder: false,
			   baseLayerPicker: false,
			   automaticallyTrackDataSourceClocks: false,
			   creditContainer: 'dummy',
		   });

var spaceteq_longitude = 19.128825;
var spaceteq_latitude = -34.224513;
image_viewer.entities.add({
	name: 'Spacteq Ground Control',
	position: Cesium.Cartesian3.fromDegrees(spaceteq_longitude, spaceteq_latitude),
	point: {
		pixelSize: 5,
		color: Cesium.Color.RED,
		outlineColor: Cesium.Color.WHITE,
		outlineWidth: 2
	},
});

// disable the default event handlers
image_viewer.scene.screenSpaceCameraController.enableRotate = false;
image_viewer.scene.screenSpaceCameraController.enableTranslate = false;
image_viewer.scene.screenSpaceCameraController.enableZoom = false;
image_viewer.scene.screenSpaceCameraController.enableTilt = false;
image_viewer.scene.screenSpaceCameraController.enableLook = false;

//image_viewer.scene.globe.enableLighting = true;
//image_viewer.scene.globe.tileCacheSize = 10;
image_viewer.fullscreenButton.destroy();

var TLE_data;
var satrecs = [];
var sampledPosition = [];
var sampledOrientation = [];

function createEntity(count,name,tle1,tle2){
	var satellites = viewer.entities.add({
		id: name,
		name: name,
		model: {
			uri: 'Apps/models/EOSat1_SD/EOSat1_SD.gltf',
			minimumPixelSize: 0.0,
			show: true
		},
		point: {
			color: Cesium.Color.RED,
			pixelSize: 5,
			outlineColor: Cesium.Color.WHITE,
			outlineWidth: 1
		}
	});
	satrecs[count] = satellite.twoline2satrec(tle1, tle2);

	sampledPosition[count] = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL, 0);
	sampledPosition[count].setInterpolationOptions({
		interpolationDegree: 3,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledPosition[count].forwardExtrapolationDuration = 10;
	satellites.position = sampledPosition[count];

	// create orientation property
	sampledOrientation[count] = new Cesium.SampledProperty(Cesium.Quaternion);
	sampledOrientation[count].setInterpolationOptions({
		interpolationDegree: 10,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledOrientation[count].forwardExtrapolationDuration = 10;
	satellites.orientation = sampledOrientation[count];
}

function update_tles(){
	$.post("/tle",{},
	function(data, status){
		TLE_data = data;
		console.log('Updated TLEs from server.')
		console.log(data);
		for (var i = 0; i < TLE_data.length; i++){
			satrecs[i] = satellite.twoline2satrec(data[i].tle[1], data[i].tle[2]);
		}
	});
}

$.post("/tle",{},
function(data, status){
	TLE_data = data;
	console.log('Received TLEs from server.');
	console.log(data);
	for (var i = 0; i < TLE_data.length; i++){
		console.log(data[i].name)
		createEntity(i, data[i].name, data[i].tle[1], data[i].tle[2]);
	}

	setInterval(sgp4_propagate, 1000);
	setInterval(update_tles, 36000000);
});

var start_counter = 0;
var g_pitch = 0;
var g_roll = 0;
var g_yaw = 0;

function computeNadir_q_ecef(cesium_time, pos, vel){
	var Teme2Fixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(cesium_time, new Cesium.Matrix3());

	var nadir = Cesium.Cartesian3.negate(pos, new Cesium.Cartesian3());
	var n_z = Cesium.Cartesian3.normalize(nadir, new Cesium.Cartesian3());	// new z
	var n_x = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3());	// new x
	var n_y = Cesium.Cartesian3.cross(n_z, n_x, new Cesium.Cartesian3());	// new y
	Cesium.Cartesian3.normalize(n_y, n_y);
	var n_x2 = Cesium.Cartesian3.cross(n_y, n_z, new Cesium.Cartesian3());	// new x
	// transform to ecef
	var n_x_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_x2, new Cesium.Cartesian3());
	var n_y_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_y, new Cesium.Cartesian3());
	var n_z_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_z, new Cesium.Cartesian3());

	var model = new Cesium.Matrix3(n_x_ecef.x, n_y_ecef.x, n_z_ecef.x, n_x_ecef.y, n_y_ecef.y, n_z_ecef.y, n_x_ecef.z, n_y_ecef.z, n_z_ecef.z);	// ecef to body
	var offset = Cesium.Matrix3.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(0, 0, 0), new Cesium.Matrix3());
	var out = Cesium.Matrix3.multiply(model, offset, new Cesium.Matrix3());

	return Cesium.Quaternion.fromRotationMatrix(out, new Cesium.Quaternion());
}

var y_thompson = false;
function sgp4_propagate(){
	js_time = new Date();
	var jd_time = Cesium.JulianDate.fromDate(js_time);
	for (var i = 0; i < TLE_data.length; i++){
		var positionAndVelocity = satellite.propagate(satrecs[i], js_time);
		sat_position = new Cesium.Cartesian3(positionAndVelocity.position.x*1e3, positionAndVelocity.position.y*1e3, positionAndVelocity.position.z*1e3);
		sat_velocity = new Cesium.Cartesian3(positionAndVelocity.velocity.x, positionAndVelocity.velocity.y, positionAndVelocity.velocity.z);
		sampledPosition[i].addSample(jd_time, sat_position);

		var q_nadir = computeNadir_q_ecef(jd_time, sat_position, sat_velocity);

		if (y_thompson){
			g_yaw = g_yaw + 0.0;
			g_pitch = g_pitch + 5*Cesium.Math.PI/180;
			g_roll = 0;
		}
		else{
			g_yaw = 0.0;
			g_pitch = 0;
			g_roll = 0;
		}

		var q_hpr = Cesium.Quaternion.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll(g_yaw, g_pitch, g_roll), new Cesium.Quaternion);
		var q_curr = Cesium.Quaternion.multiply(q_nadir, q_hpr, new Cesium.Quaternion);

		sampledOrientation[i].addSample(jd_time, q_curr);


	}
	start_counter++;
	if (start_counter > 4 && start_counter < 6){
		clock_1._shouldAnimate = true;
		console.log('Visualiser is live now.')
	}
}

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

// toggle y thompson and nadir
Mousetrap.bind('y', function (e) {
    if (y_thompson) {
        y_thompson = false;
    }
    else {
        y_thompson = true;
    }
});
// home view
Mousetrap.bind('h', function (e) {
    var transitioner = new Cesium.SceneModePickerViewModel(viewer.scene);
    transitioner.morphTo3D();
    // set camera origin
	viewer.camera.flyTo({
		destination : Cesium.Cartesian3.fromDegrees(home_lon, home_lat, 25000000.0)
	});

    viewer.trackedEntity = undefined;
});


viewer.clock.onTick.addEventListener(function () {
	EOSat1 = viewer.entities.getById('EOSSAT-1')
	if (EOSat1 !== undefined) {
		var modelMatrix = EOSat1.computeModelMatrix(viewer.clock.currentTime);
		if (modelMatrix !== undefined) {
			// modelMatrix contains rotation and translation
			// we need to translate in the body frame
			// get rotation matrix
			var dcm = Cesium.Matrix4.getRotation(modelMatrix, new Cesium.Matrix3());
			var translation = Cesium.Matrix4.getTranslation(modelMatrix, new Cesium.Cartesian3());
			var sat_q = EOSat1.orientation;
			var q = sat_q.getValue(viewer.clock.currentTime);
            if (q !== undefined) {
                var dcm2 = Cesium.Matrix3.fromQuaternion(q);
				// up direction
				var imager_up_ecef = Cesium.Matrix3.multiplyByVector(dcm2, new Cesium.Cartesian3(1, 0, 0), new Cesium.Cartesian3());
				var imager_in_ecef = Cesium.Matrix3.multiplyByVector(dcm2, new Cesium.Cartesian3(0, 0, 1), new Cesium.Cartesian3());

				// set direction
				image_viewer.camera.direction = imager_in_ecef;
				image_viewer.camera.up = imager_up_ecef;
				image_viewer.percentageChanged = 0.1;

				image_viewer.camera.position = EOSat1.position.getValue(viewer.clock.currentTime);
				image_viewer.camera.frustum.fov = 20 * Cesium.Math.PI / 180;
				image_viewer.camera.frustum.aspectRatio = 1;
				image_viewer.clock = viewer.clock;
				image_viewer.render();
            }
		}
	}

});
