// import {
// 	BufferGeometry,
// 	Euler,
// 	FileLoader,
// 	Float32BufferAttribute,
// 	Group,
// 	LineBasicMaterial,
// 	LineSegments,
// 	Loader
// } from '../../../build/three.module.js';

/**
 * GCodeLoader is used to load gcode files usually used for 3D printing or CNC applications.
 *
 * Gcode files are composed by commands used by machines to create objects.
 *
 * @class GCodeLoader
 * @param {Manager} manager Loading manager.
 */

class GCodeLoader extends Loader {

	constructor( manager ) {

		super( manager );

		this.splitLayer = false;

	}

	load( url, onLoad,onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			try {
				
				onLoad( scope.parse( text ) );
				
				// console.log(text);
				

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	}
	

	parse( data ) {

		let state = { x: 0, y: 0, z: 0, e: 0, f: 0, extruding: false, relative: false };
		const layers = [];

		let currentLayer = undefined;

		const pathMaterial = new LineBasicMaterial( { color: 0xFF0000 } );
		pathMaterial.name = 'path';

		const extrudingMaterial = new LineBasicMaterial( { color: 0x00FF00 } );
		extrudingMaterial.name = 'extruded';

		function newLayer( line ) {

			currentLayer = { vertex: [], pathVertex: [], z: line.z };
			layers.push( currentLayer );

		}

		//Create lie segment between p1 and p2
		function addSegment( p1, p2 ) {

			if ( currentLayer === undefined ) {

				newLayer( p1 );

			}

			if ( state.extruding ) {

				currentLayer.vertex.push( p1.x, p1.y, p1.z );
				currentLayer.vertex.push( p2.x, p2.y, p2.z );

			} else {

				currentLayer.pathVertex.push( p1.x, p1.y, p1.z );
				currentLayer.pathVertex.push( p2.x, p2.y, p2.z );

			}

		}

		function delta( v1, v2 ) {

			return state.relative ? v2 : v2 - v1;

		}

		function absolute( v1, v2 ) {

			return state.relative ? v1 + v2 : v2;

		}
		function toRadians(angle) {
			return angle * (Math.PI / 180);
		}
		
		function toDegrees(angle) {
			return angle * (180 / Math.PI);
		}
		function angleStart(s,a){
			return 0;
		}
		function angleEnd(s,a){
			var e= new THREE.Vector3(s.x,s.y,0);
			var c= new THREE.Vector3((a.i+s.x),(a.j+s.y),0);
			var p= new THREE.Vector3(a.x,a.y,0);
			var d=c.distanceTo(e);//R
			var d1=e.distanceTo(p);//D
			return ((Math.PI*2)-(Math.sin((((0.5*d1)/d)))*2))
			// console.log(d);
		}
		function angleEndT(s,a){
			var e= new THREE.Vector3(s.x,s.y,0);
			var c= new THREE.Vector3((a.i+s.x),(a.j+s.y),0);
			var p= new THREE.Vector3(a.x,a.y,0);
			var d=c.distanceTo(e);//R
			var d1=e.distanceTo(p);//D
			return Math.sin((((0.5*d1)/d)))*2
			// console.log(d);
		}
		const lines = data.replace( /;.+/g, '' ).split( '\n' );
		for ( let i = 0; i < lines.length; i ++ ) {

			const tokens = lines[ i ].split( ' ' );
			const cmd = tokens[ 0 ].toUpperCase();

			//Argumments
			const args = {};
			tokens.splice( 1 ).forEach( function ( token ) {

				if ( token[ 0 ] !== undefined ) {

					const key = token[ 0 ].toLowerCase();
					const value = parseFloat( token.substring( 1 ) );
					args[ key ] = value;

				}

			} );
			
			//Process commands
			//G0/G1 – Linear Movement
			if (cmd === 'G00' || cmd === 'G0' || cmd === 'G01' || cmd==='G1') {

				const line = {
					x: args.x !== undefined ? absolute( state.x, args.x ) : state.x,
					y: args.y !== undefined ? absolute( state.y, args.y ) : state.y,
					z: args.z !== undefined ? absolute( state.z, args.z ) : state.z,
					e: args.e !== undefined ? absolute( state.e, args.e ) : state.e,
					f: args.f !== undefined ? absolute( state.f, args.f ) : state.f,
				};

				//Layer change detection is or made by watching Z, it's made by watching when we extrude at a new Z position
				if ( delta( state.e, line.e ) > 0 ) {

					state.extruding = delta( state.e, line.e ) > 0;

					if ( currentLayer == undefined || line.z != currentLayer.z ) {

						newLayer( line );

					}

				}

				addSegment( state, line );
				state = line;
				console.log(state)
			} else if ( cmd==='G02' || cmd === 'G2' || cmd==='G03' || cmd === 'G3' ) {

				const line={
				    x:args.x,
					y:args.y,
					z:args.z,
					i:args.i,
					j:args.j,
					f:state.f,
					e:state.e,
					a:(state.a===undefined)?0:state.a+angleEnd(state,args),
					b:(state.b===undefined)?0:state.b+angleEnd(state,args)
					}
				var	s=new THREE.Vector3(state.x,state.y,0),
					e=new THREE.Vector3(state.x+line.i,state.y+line.j,0),
					r=s.distanceTo(e);
					
					console.log(r);
					(cmd=='G03' || cmd=='G3')?line.b=0:line.a=0;
					
				const arc=new THREE.EllipseCurve(
					line.i+state.x,
					line.j+state.y,
					r,
					r,
					(cmd==='G3' || cmd==='G03')?Math.PI-angleEnd(state,args)-line.a:Math.PI+line.b,
					(cmd==='G3' || cmd==='G03')?Math.PI-line.a:Math.PI+line.b-angleEnd(state,args),
					// 0,
					(cmd==='G3' || cmd==='G03')?true:false,
					0
					

				)
				var points = arc.getPoints( 50 );
				const geometry = new THREE.BufferGeometry().setFromPoints( points );
				const material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
				const ellipse = new THREE.Line( geometry, material );
				ellipse.quaternion.setFromEuler( new Euler( - Math.PI / 2, 0, 0 ) );
				ellipse.position.set(-100, -50, -300);
				ellipse.rotateX(toRadians(90));
				scene.add(ellipse)
				// if(i<2)
				//   scene.add(ellipse);
				// i++;
				state=line
				console.log(line);
					
			} else if ( cmd === 'G90' ) {

				//G90: Set to Absolute Positioning
				state.relative = false;

			} else if ( cmd === 'G91' ) {

				//G91: Set to state.relative Positioning
				state.relative = true;

			} else if ( cmd === 'G92' ) {

				//G92: Set Position
				const line = state;
				line.x = args.x !== undefined ? args.x : line.x;
				line.y = args.y !== undefined ? args.y : line.y;
				line.z = args.z !== undefined ? args.z : line.z;
				line.e = args.e !== undefined ? args.e : line.e;
				state = line;

			} else {

				//console.warn( 'THREE.GCodeLoader: Command not supported:' + cmd );

			}

		}

		function addObject( vertex, extruding, i ) {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( vertex, 3 ) );
			const segments = new LineSegments( geometry, extruding ? extrudingMaterial : pathMaterial );
			segments.name = 'layer' + i;
			object.add( segments );

		}

		const object = new Group();
		object.name = 'gcode';

		if ( this.splitLayer ) {

			for ( let i = 0; i < layers.length; i ++ ) {

				const layer = layers[ i ];
				addObject( layer.vertex, true, i );
				addObject( layer.pathVertex, false, i );

			}

		} else {

			const vertex = [],
				pathVertex = [];

			for ( let i = 0; i < layers.length; i ++ ) {

				const layer = layers[ i ];
				const layerVertex = layer.vertex;
				const layerPathVertex = layer.pathVertex;

				for ( let j = 0; j < layerVertex.length; j ++ ) {

					vertex.push( layerVertex[ j ] );

				}

				for ( let j = 0; j < layerPathVertex.length; j ++ ) {

					pathVertex.push( layerPathVertex[ j ] );

				}

			}

			addObject( vertex, true, layers.length );
			addObject( pathVertex, false, layers.length );

		}

		object.quaternion.setFromEuler( new Euler( - Math.PI / 2, 0, 0 ) );

		return object;

	}

}

// export { GCodeLoader };
