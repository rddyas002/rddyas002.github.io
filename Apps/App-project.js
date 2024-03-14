Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4NDRiOWRlZC1hMGNhLTQ4MTItYTc4Mi0xNDU2NDcwZGY4ODYiLCJpZCI6MTYwMDUyLCJpYXQiOjE2OTE4NTY2NDd9.2dR-_W79kbY5yxpTk8epVwacyMLx3xAjjBbLIOQy8rc';

var bing = new Cesium.BingMapsImageryProvider({
    url : 'https://dev.virtualearth.net',
    key : 'f9bi6fIZNm3w98sNXXhR~H1vdqlbzNAuLNn6607rNiA~AhiZmKtvhQltEYCRO3P6Z7yugnt-UVX4wFSoVOdgpiU5MNT4Af9bUCBUJJszna9a',
    mapStyle : Cesium.BingMapsStyle.AERIAL
});

var sat_id = 'EOSSAT-1'

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

// default timeline view
viewer.animation.container.hidden = false;
viewer.timeline.container.hidden = false;

var q_eci_const = new Cesium.Quaternion(-0.7671483554, 0.4767377021, 0.4052225890, 0.1414185899)
var sat_const = new Cesium.Cartesian3(-2827455.6080946,   4519470.03769826,  4352790.20939846)
viewer.clock.currentTime = Cesium.JulianDate.fromIso8601("2024-03-03T01:43:02.235830Z");
// Reference from Stephen
var target_lat = 39.424740;
var target_lon = 122.033175;

// Lat/lon estimate
var calc_lat = 39.4187181004124;
var calc_lon = 122.03053714428599;
var calculated_position = Cesium.Cartesian3.fromDegrees(calc_lon, calc_lat)

// plot target
viewer.entities.add({
	position: Cesium.Cartesian3.fromDegrees(target_lon, target_lat),
	point: {
		color: Cesium.Color.GREEN.withAlpha(0.5),
		pixelSize: 15,
		outlineColor: Cesium.Color.WHITE,
		outlineWidth: 2
	}
});


viewer.clock.startTime = Cesium.JulianDate.addDays(viewer.clock.currentTime, -1, new Cesium.JulianDate());
viewer.clock.stopTime = Cesium.JulianDate.addDays(viewer.clock.currentTime, 1, new Cesium.JulianDate());
// viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
viewer.clock.shouldAnimate = false;

var timeInterval = new Cesium.TimeInterval({
	start : viewer.clock.startTime,
	stop : viewer.clock.stopTime,
	isStartIncluded : true,
	isStopIncluded : true
	});
var promise = Cesium.Transforms.preloadIcrfFixed(timeInterval);
promise.then(function() {
	var fixedToIcrf = Cesium.Transforms.computeIcrfToFixedMatrix(viewer.clock.currentTime);
	if (Cesium.defined(fixedToIcrf)) {
		property = add_discrete_data()
		createEntity(sat_id, property);
	}
	else{
		console.info("FAILURE");
	}
});

var home_lon = 18.837977;
var home_lat = 0;
// set camera origin
viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(home_lon, home_lat, 25000000.0)
});

image_viewer = new Cesium.Viewer('imageViewInside', {
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
			// plot target
			image_viewer.entities.add({
				position: Cesium.Cartesian3.fromDegrees(target_lon, target_lat),
				point: {
					color: Cesium.Color.GREEN.withAlpha(0.5),
					pixelSize: 15,
					outlineColor: Cesium.Color.WHITE,
					outlineWidth: 2
				}
});

// disable the default event handlers
image_viewer.scene.screenSpaceCameraController.enableRotate = false;
image_viewer.scene.screenSpaceCameraController.enableTranslate = false;
image_viewer.scene.screenSpaceCameraController.enableZoom = false;
image_viewer.scene.screenSpaceCameraController.enableTilt = false;
image_viewer.scene.screenSpaceCameraController.enableLook = false;
image_viewer.fullscreenButton.destroy();
var init_load = false
image_viewer.scene.postRender.addEventListener(onMapLoaded);

// Create body frame
var EOSSat1Frame = viewer.scene.primitives.add(new Cesium.DebugModelMatrixPrimitive({
	id: 'EOSSat1Frame',
	length: 2000,
	width: 5.0
}));

function createEntity(name,property){
	var satellite_entity = viewer.entities.add({
		id: name,
		name: name,
		model: {
			//uri: 'Apps/models/EOSat1_SD/EOSat1_SD.gltf',
			uri: 'Apps/models/EOSSAT1/EOSSAT1.gltf',
			// uri: 'Apps/models/EOSSAT1/eossat-1.glb',
			minimumPixelSize: 0.0,
			show: true
		},
		point: {
			color: Cesium.Color.RED,
			pixelSize: 10,
			outlineColor: Cesium.Color.WHITE,
			outlineWidth: 1
		}
	});

	satellite_entity.position = property[0];
	satellite_entity.orientation = property[1];
}

function add_discrete_data() {
	var sampledPosition = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.FIXED, 0);
	sampledPosition.setInterpolationOptions({
		interpolationDegree: 1,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledPosition.forwardExtrapolationDuration = 1;

	var sampledOrientation = new Cesium.SampledProperty(Cesium.Quaternion);
	sampledOrientation.setInterpolationOptions({
		interpolationDegree: 1,
		interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
	});
	sampledOrientation.forwardExtrapolationDuration = 1;

	var jd = viewer.clock.currentTime
	console.log(jd)

	Cesium.JulianDate.addSeconds(jd, -5.0, jd)


	for (let i = 0; i < 10; i++) {
		Cesium.JulianDate.addSeconds(jd, 1.0, jd)
		q = rotate_q_eci_to_ecef(jd, q_eci_const)
		sampledPosition.addSample(Cesium.JulianDate.clone(jd), sat_const);
		sampledOrientation.addSample(Cesium.JulianDate.clone(jd), q);
	}

	return [sampledPosition, sampledOrientation]
}


function rotate_q_eci_to_ecef(jd, q_eci) {
	// get matrix from ECI to ECEF
	var icrf2fixed = Cesium.Transforms.computeIcrfToFixedMatrix(jd);
	console.log(icrf2fixed)
	var q_teme = Cesium.Quaternion.fromRotationMatrix(icrf2fixed, new Cesium.Quaternion());
	var q_curr = Cesium.Quaternion.multiply(q_teme, q_eci, new Cesium.Quaternion);
	return q_curr

}

function computeNadir_q_ecef(cesium_time, pos, vel){
	var Teme2Fixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(cesium_time, new Cesium.Matrix3());

	var nadir = Cesium.Cartesian3.negate(pos, new Cesium.Cartesian3());
	var n_z = Cesium.Cartesian3.normalize(nadir, new Cesium.Cartesian3());	// new z
	var n_x = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3());	// new x
	var n_y = Cesium.Cartesian3.cross(n_z, n_x, new Cesium.Cartesian3());	// new y
	Cesium.Cartesian3.normalize(n_y, n_y);
	var n_x2 = Cesium.Cartesian3.cross(n_y, n_z, new Cesium.Cartesian3());	// new x

	// get sun vector
	var sun_pos = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(viewer.clock.currentTime, new Cesium.Cartesian3());
	sun_pos_x = Cesium.Cartesian3.normalize(sun_pos, new Cesium.Cartesian3());
	var dp = Cesium.Cartesian3.dot(nadir, sun_pos_x);
	var dp_sun_pos_x = Cesium.Cartesian3.multiplyByScalar(sun_pos_x, dp, new Cesium.Cartesian3());
	var z = Cesium.Cartesian3.subtract(nadir, dp_sun_pos_x, new Cesium.Cartesian3());


	// transform to ecef
	var n_x_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_x2, new Cesium.Cartesian3());
	var n_y_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_y, new Cesium.Cartesian3());
	var n_z_ecef = Cesium.Matrix3.multiplyByVector(Teme2Fixed, n_z, new Cesium.Cartesian3());

	var model = new Cesium.Matrix3(n_x_ecef.x, n_y_ecef.x, n_z_ecef.x, n_x_ecef.y, n_y_ecef.y, n_z_ecef.y, n_x_ecef.z, n_y_ecef.z, n_z_ecef.z);	// ecef to body
	var offset = Cesium.Matrix3.fromHeadingPitchRoll(new Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0), new Cesium.Matrix3());
	var out = Cesium.Matrix3.multiply(model, offset, new Cesium.Matrix3());

	return Cesium.Quaternion.fromRotationMatrix(out, new Cesium.Quaternion());
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


Mousetrap.bind('up', function (e) {
    fov /= 2
});

Mousetrap.bind('down', function (e) {
    fov *= 2
});

var fov = 1

function onMapLoaded() {
	if (init_load == false) {
		const ray = image_viewer.camera.getPickRay(new Cesium.Cartesian2(205, 200));
		const earthPosition = image_viewer.scene.globe.pick(ray, image_viewer.scene);
		if (Cesium.defined(earthPosition)) {
			// plot projection of camera
		  createPoint(earthPosition, Cesium.Color.RED);
		  // plot calculate result
		  createPoint(calculated_position, Cesium.Color.YELLOW);
		}
		init_load = true
	}
}

function createPoint(worldPosition, color) {
	const point = image_viewer.entities.add({
	  position: worldPosition,
	  point: {
		color: color,
		pixelSize: 6,
		heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
	  },
	});
	const point2 = viewer.entities.add({
		position: worldPosition,
		point: {
		  color: color,
		  pixelSize: 6,
		  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
		},
	  });
  }

const handler = new Cesium.ScreenSpaceEventHandler(image_viewer.canvas);
handler.setInputAction(function (event) {
  // We use `viewer.scene.globe.pick here instead of `viewer.camera.pickEllipsoid` so that
  // we get the correct point when mousing over terrain.
  const ray = image_viewer.camera.getPickRay(new Cesium.Cartesian2(205, 200));
  rect = image_viewer.scene.camera.computeViewRectangle()
  cart = Cesium.Rectangle.center(rect)
  const earthPosition = Cesium.Cartesian3.fromRadians(cart.longitude, cart.latitude)

  image_viewer.scene.globe.pick(ray, image_viewer.scene);
  // `earthPosition` will be undefined if our mouse is not over the globe.
  if (Cesium.defined(earthPosition)) {
	// plot projection of camera
	createPoint(earthPosition, Cesium.Color.RED);
	// plot calculate result
	createPoint(calculated_position, Cesium.Color.YELLOW);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// image_viewer.camera.flyTo({
//     destination : Cesium.Cartesian3.fromDegrees(target_lon, target_lat, 25000000.0)
// });
var print_once = false
viewer.clock.onTick.addEventListener(function () {
	EOSat1 = viewer.entities.getById(sat_id)
	if (EOSat1 !== undefined) {
		var modelMatrix = EOSat1.computeModelMatrix(viewer.clock.currentTime);
		if (modelMatrix !== undefined) {
			// modelMatrix contains rotation and translation
			// we need to translate in the body frame
			// get rotation matrix
			var dcm = Cesium.Matrix4.getRotation(modelMatrix, new Cesium.Matrix3());
			if (print_once == false) {
				console.log(dcm)
				print_once = true
			}
			var translation = Cesium.Matrix4.getTranslation(modelMatrix, new Cesium.Cartesian3());
			// console.log(translation)
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
				image_viewer.camera.frustum.fov = fov * Cesium.Math.PI / 180;
				image_viewer.camera.frustum.aspectRatio = 1;
				image_viewer.clock = viewer.clock;
				image_viewer.render();
            }

            EOSSat1Frame.modelMatrix = modelMatrix;
            // Get distance to Eosat
            var bs = new Cesium.BoundingSphere(EOSat1.position.getValue(viewer.clock.currentTime));
            var distance = viewer.camera.distanceToBoundingSphere(bs);
            EOSSat1Frame.length = distance / 5;
		}
	}

});
