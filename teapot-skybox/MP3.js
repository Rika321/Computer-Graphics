var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

// Create Projection matrix
var pMatrix = mat4.create();

// Create Normal matrix
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var cubeImage;
var cubeTexture;

// View parameters
var rot = quat.create([0.0, 0.0, 0.0, 1.0]);
var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var Rot = quat.create();
//-------------------------------------------------------------------------------------------

var Upward = vec3.fromValues(0.0, 1.0, 0.0);
var EyePoint = vec3.fromValues(0.0,0.0,10.0);


// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

Ready_Draw = false;

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
* Function to pass the normal matrix to the shader program
* @return None
*/
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
* Function to manipulate lighting information in shader for Phong Lighting Model
* @return None
*/
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function uploadViewDirToShader(){
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}


// this function upload mvMatrixUniform to shader
//----------------------------------------------------------------------------------
function uploadRotateMatrixToShader(rotateMat){
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uRotateMat"), false, rotateMat);
}

//this function pushes the current Matrix
//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//this function pops the current Matrix 
//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//this function set the current Matrix to be uniform 
//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//this function converts degrees to Rad
//----------------------------------------------------------------------------------
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

//sets up the GL context using canvas
//----------------------------------------------------------------------------------
function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
		try {
		  context = canvas.getContext(names[i]);
		} catch(e) {}
		if (context) {
		  break;
		}
	}
	if (context) {
		context.viewportWidth = canvas.width;
		context.viewportHeight = canvas.height;
	} else {
		alert("Failed to create WebGL context!");
	}
	return context;
}

//helper function that compiles the shader and checks if there were compilation errors
//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
	var shaderScript = document.getElementById(id);

	// If we don't find an element with the specified id
	// we do an early exit 
	if (!shaderScript) {
		return null;
	}

	// Loop through the children for the found DOM element and
	// build up the shader source code as a string
	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	while (currentChild) {
		if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
			shaderSource += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	} 
	return shader;
}

//----------------------------------------------------------------------------------
function switchShaders(isSkybox){
	gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsSkybox"), isSkybox);
}


//help function to setup Shaders
//----------------------------------------------------------------------------------
function setupShaders() {
	vertexShader = loadShaderFromDOM("shader-vs");
	fragmentShader = loadShaderFromDOM("shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Failed to setup shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
//	// Enable vertex colors
//    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
//    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
	
	// Enable vertex normals
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

//this function set up buffers for both objects
//----------------------------------------------------------------------------------
function setupBuffers(){
    Setskyboxscene();
	readTextFile("teapot_0.obj", setupTeapotBuffers);
}

//animation struct for TeaPot
///---------------
 var TeaPot = {
        rotate_x_clock_wise: true,
        rotate_x_counter_clock_wise: false,
        rotate_y_clock_wise: false, 
        rotate_x_counter_clock_wise: false,
        stop: false
}

//this function helps us draw the scene 
//----------------------------------------------------------------------------------
function draw() { 
    var translateVec = vec3.create();
    var scaleVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    //Draw 
    mvPushMatrix();
	var rotateMat = mat4.create();
	mat4.rotateY(rotateMat, rotateMat, modelYRotationRadians);
	uploadRotateMatrixToShader(rotateMat);
    vec3.set(translateVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,translateVec);
    setMatrixUniforms();
	
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
	uploadLightsToShader([0,20,0],[0.0,0.0,0.0],[0.3,0.3,0.3],[0.3,0.3,0.3]);
	
    //    var TeaPot = {
//        rotate_x_clock_wise: false,
//        rotate_x_counter_clock_wise: false,
//        rotate_y_clock_wise: false, 
//        rotate_y_clock_wise: false
//}
    
    
    drawSkybox();
	if (Ready_Draw){
		//mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
        
        if(TeaPot.rotate_x_clock_wise || TeaPot.rotate_x_counter_clock_wise){
            mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);    
        }
        else if(TeaPot.rotate_y_clock_wise || TeaPot.rotate_y_counter_clock_wise){
            mat4.rotateX(mvMatrix,mvMatrix,modelYRotationRadians);    
        }
        else if(TeaPot.stop){
            mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);    
        }
        
        
		drawTeapot();
	}
    mvPopMatrix();
  
}

//main animate function 
//----------------------------------------------------------------------------------
function animate() {
    if (then==0)
    {
    	then = Date.now();
    }
    else
    {
		now=Date.now();
		// Convert to seconds
		now *= 0.001;
		// Subtract the previous time from the current time
		var deltaTime = now - then;
		// Remember the current time for the next frame.
		then = now;  
		
		// Animate the Rotation
        
        
//    var TeaPot = {
//        rotate_x_clock_wise: false,
//        rotate_x_counter_clock_wise: false,
//        rotate_y_clock_wise: false, 
//        rotate_y_clock_wise: false
//}
        if(TeaPot.rotate_x_clock_wise || TeaPot.rotate_y_clock_wise){
            modelYRotationRadians += 0.01;   
        }
        else if(TeaPot.rotate_x_counter_clock_wise || TeaPot.rotate_y_counter_clock_wise){
            modelYRotationRadians -= 0.01;      
        }
        else if(TeaPot.stop){
            modelYRotationRadians += 0.0;     
        }
        
    }
}

//this function set up cube map
function setupCubeMap() {
    // Initialize the Cube Map, and set its parameters
    cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture); 
	
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, 
          gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,    
          gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    
    // Load up each cube map face
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
          cubeTexture, 'pos-x.png');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,    
         cubeTexture,  'neg-x.png');    
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
        cubeTexture, 'pos-y.png');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
       cubeTexture, 'neg-y.png');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
       cubeTexture, 'pos-z.png');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
       cubeTexture, 'neg-z.png'); 
//	
}

//this function load image to map face 
//---------------------------------------------------------------------------------
function loadCubeMapFace(gl, target, texture, url){
//TODO: Onload call function
    var image = new Image();
    image.onload = function()
    {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    image.src = url;
}

//this function determine whether value is power of 2
//---------------------------------------------------------------------------------

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

//---------------------------------------------------------------------------------

function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

//
//----------------------------------------------------------------------------------
function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// set up event listener for keystrokes
	document.onkeydown = handleKeyDown;
    //document.onkeyup   = handkeKeyUp; 
    true
    
	setupShaders();
	setupBuffers();
	setupCubeMap();
	tick();
}

//this function can add animation to the scene
//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
//-----------------------------------------------------------------------------------

/**
 * Gets a file from the server for processing on the client side.
 *
 * @param  file A string that is the name of the file to get
 * @param  callbackFunction The name of function (NOT a string) that will receive a string holding the file
 *         contents.
 *
 */
function readTextFile(file, callbackFunction)
{
    console.log("reading "+ file);
    var rawFile = new XMLHttpRequest();
    var allText = [];
    rawFile.open("GET", file, true);
    
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                 callbackFunction(rawFile.responseText);
                 console.log("Got text file!");
                 
            }
        }
    }
    rawFile.send(null);
}

//---------------------------------------------------------------------------------------
var teapotVertexBuffer;
var teapotVertexNormalBuffer;
var teapotTriIndexBuffer;

//this function helps create Teapot Buffer
// ------------------------------------------------------
function setupTeapotBuffers(raw_file_text){
	var vertices = [];
	var faces = [];
	count_vertices = 0;
	count_faces = 0;
	
	// read in vertex and face data
	var lines = raw_file_text.split("\n");
	for (var line_num in lines){
		list_elements = lines[line_num].split(' ');
		
		if (list_elements[0] == 'v'){
			vertices.push(parseFloat(list_elements[1]));
			vertices.push(parseFloat(list_elements[2]));
			vertices.push(parseFloat(list_elements[3]));
			count_vertices += 1;
		}
		else if(list_elements[0] == 'f'){
			faces.push(parseInt(list_elements[2])-1);
			faces.push(parseInt(list_elements[3])-1);
			faces.push(parseInt(list_elements[4])-1);
			count_faces += 1;
		}
	}
	
	// bind vertex data
	teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	teapotVertexBuffer.numItems = count_vertices;
	
	// calculate normals
	var normals = [];
	for (var i=0; i < count_vertices; i++){
		normals.push(0);
		normals.push(0);
		normals.push(0);
	}
	calculateNormals(vertices, faces, count_faces, count_vertices, normals);
	
	// bind normal data
	teapotVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = count_faces;
	
	// bind face data
    teapotTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	teapotTriIndexBuffer.numItems = count_faces;
	Ready_Draw = true;
}
//this function helps us draw the Teapot
function drawTeapot(){
	switchShaders(false);
	uploadViewDirToShader()
	
	// Draw the cube by binding the array buffer to the cube's vertices
	// array, setting attributes, and pushing it to GL.
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
		
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);  

	// Draw the cube.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
}

/**
* This function calculates the vertex normals by calculating the surface normals
*   of each face of the teapot, and then for each point averaging the surface normals
*   of the faces it is a part of.
* @param {Array.<[float, float, float]>} vertices Array of floats
*   indicating the X,Y,Z coordinates of each vertex in space
* @param {Array.<[int, int, int]>} Array of integers specifing
*   which verticies constitute the triangle face
* @param {int} numT Number of triangles in the terrain
* @param {int} numV Number of verticies in the terrain
* @param {Array.<[float, float, float]>} Array of floats
*   indicating the X,Y,Z components of each face's normal vector
* @return None
*/
function calculateNormals(vertices, faces, numT, numV, normals){
    var faceNormals = [];
    
    // calculate normals for each triangle
    for (var i = 0; i < numT; i++){
        
        
        var v1 = faces[i*3 + 0];
        var v2 = faces[i*3 + 1];
        var v3 = faces[i*3 + 2];     
        // compute surface normal
        var e1 = vec3.fromValues(vertices[3*v2]-vertices[3*v1], vertices[3*v2+1]-vertices[3*v1+1], vertices[3*v2+2]-vertices[3*v1+2]);
        var e2 = vec3.fromValues(vertices[3*v3]-vertices[3*v1], vertices[3*v3+1]-vertices[3*v1+1], vertices[3*v3+2]-vertices[3*v1+2]);
        var normal = vec3.create();
        vec3.cross(normal, e1, e2);
		
        for(var j = 0; j < 3; j++ ){
            faceNormals.push(normal[j]);
        }
    }
	    
    // initialize count array to all 0s
    var count = []
    for (var i = 0; i < numV; i++)
        count.push(0);
    
    // calculate sum of the surface normal vectors to which each vertex belongs
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3 + 0]
        var v2 = faces[i*3 + 1]
        var v3 = faces[i*3 + 2]
        // iterate over each vertex in triangle
        count[v1] += 1
        count[v2] += 1
        count[v3] += 1
        
        // vertex 0
        normals[3*v1 + 0] += faceNormals[i*3 + 0];
        normals[3*v1 + 1] += faceNormals[i*3 + 1];
        normals[3*v1 + 2] += faceNormals[i*3 + 2];
        
        // vertex 1
        normals[3*v2 + 0] += faceNormals[i*3 + 0];
        normals[3*v2 + 1] += faceNormals[i*3 + 1];
        normals[3*v2 + 2] += faceNormals[i*3 + 2];
        
        // vertex 2
        normals[3*v3 + 0] += faceNormals[i*3 + 0];
        normals[3*v3 + 1] += faceNormals[i*3 + 1];
        normals[3*v3 + 2] += faceNormals[i*3 + 2];
    }
	    
    // average each normal vector in normalsNormalBuffer
    // then normalize each normal vector in normalsNormalBuffer
    for (var i = 0; i < numV; i++){
        // average out the adjacent surface normal vectors for point
        normals[3*i+0] = normals[3*i+0]/count[i];
        normals[3*i+1] = normals[3*i+1]/count[i];
        normals[3*i+2] = normals[3*i+2]/count[i];
        
        // normalize the normal vector
        var normal = vec3.fromValues(normals[i*3+0], normals[i*3+1], normals[i*3+2]);
        var normalized = vec3.create();
        vec3.normalize(normalized, normal);
        
        // store the normal vector
        normals[i*3+0] = normalized[0];
        normals[i*3+1] = normalized[1];
        normals[i*3+2] = normalized[2];
    }
}


//this function help create skybox buffer
//----------------------------------------------------------------------------------
function Setskyboxscene() {

  // Create a buffer for the cube's vertices.
  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.
  var vertices = [
    // Front face
    -75.0, -75.0,  75.0,
     75.0, -75.0,  75.0,
     75.0,  75.0,  75.0,
    -75.0,  75.0,  75.0,

    // Back face
    -75.0, -75.0, -75.0,
    -75.0,  75.0, -75.0,
     75.0,  75.0, -75.0,
     75.0, -75.0, -75.0,

    // Top face
    -75.0,  75.0, -75.0,
    -75.0,  75.0,  75.0,
     75.0,  75.0,  75.0,
     75.0,  75.0, -75.0,

    // Bottom face
    -75.0, -75.0, -75.0,
     75.0, -75.0, -75.0,
     75.0, -75.0,  75.0,
    -75.0, -75.0,  75.0,

    // Right face
     75.0, -75.0, -75.0,
     75.0,  75.0, -75.0,
     75.0,  75.0,  75.0,
     75.0, -75.0,  75.0,

    // Left face
    -75.0, -75.0, -75.0,
    -75.0, -75.0,  75.0,
    -75.0,  75.0,  75.0,
    -75.0,  75.0, -75.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.
  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);


  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  var cubeVertexIndices = [ 
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

//-----------------------------------------------------------------------------------
function drawSkybox(){
  switchShaders(true);
	
	// Draw the cube by binding the array buffer to the cube's vertices
	// array, setting attributes, and pushing it to GL.
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	
	// Draw the cube by binding the array buffer to the cube's vertices
	// array, setting attributes, and pushing it to GL.
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

	// Specify the texture to map onto the faces.
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

	// Draw the cube.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}


//this function helps us pitch up or down 
//---------------------------------------------
function pitch(rotationRate) {
    var tempQuat = quat.create();
    var vecTemp = vec3.create();
    vec3.cross(vecTemp, viewDir, Upward);
    quat.setAxisAngle(tempQuat,  vecTemp , rotationRate);
    quat.normalize(tempQuat, tempQuat);
    // apply new rotation to global quaternion
    quat.multiply(Rot, tempQuat, Rot);
    quat.normalize(Rot, Rot);
    
    vec3.transformQuat(eyePt, EyePoint, Rot);
	vec3.normalize(viewDir, eyePt);
	vec3.scale(viewDir, viewDir, -1);    

}

//this function helps us turn right or left directions
//----------------------------------------------------------------------------------
function turn(rotationRate) {
    
    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat,  Upward , rotationRate);
    quat.normalize(tempQuat, tempQuat);
    // apply new rotation to global quaternion
    quat.multiply(Rot, tempQuat, Rot);
    quat.normalize(Rot, Rot);
    
    vec3.transformQuat(eyePt, EyePoint, Rot);
	vec3.normalize(viewDir, eyePt);
	vec3.scale(viewDir, viewDir, -1);
    
}
//---------------------------------------------
/**
* Function to handle user input (from arrow keys)
* @param {keystroke event} event Data structure containing information about the previous
*   keystroke.
*/
function handleKeyDown(event){
	// left arrow key -> roll left
    if (event.keyCode == 37){
        turn(0.05);
    }
    // right arrow key -> roll right
    else if (event.keyCode == 39){
        turn(-0.05);
    }
     // right arrow key -> roll up
    else if (event.keyCode == 38){
       pitch(0.05);
    }
     // right arrow key -> roll down
    else if (event.keyCode == 40){
       pitch(-0.05);
    }
    
//    var TeaPot = {
//        rotate_x_clock_wise: false,
//        rotate_x_counter_clock_wise: false,
//        rotate_y_clock_wise: false, 
//        rotate_y_clock_wise: false
//}
    
    
    //up w
    else if (event.keyCode ==87){
        TeaPot.rotate_x_clock_wise = false; 
        TeaPot.rotate_x_counter_clock_wise = false;
        TeaPot.rotate_y_clock_wise = true; 
        TeaPot.rotate_y_counter_clock_wise= false;
         TeaPot.stop=false; 
    }
    //down s 83
    else if (event.keyCode ==83){
        TeaPot.rotate_x_clock_wise = false; 
        TeaPot.rotate_x_counter_clock_wise = false;
        TeaPot.rotate_y_clock_wise = false; 
        TeaPot.rotate_y_counter_clock_wise= true; 
        TeaPot.stop=false; 
        
    }
    //right 
    else if (event.keyCode == 65){
        TeaPot.rotate_x_clock_wise = true; 
        TeaPot.rotate_x_counter_clock_wise = false;
        TeaPot.rotate_y_clock_wise = false; 
        TeaPot.rotate_y_counter_clock_wise= false;
        TeaPot.stop=false; 
    }
    //left
    else if (event.keyCode == 68){
        TeaPot.rotate_x_clock_wise = false; 
        TeaPot.rotate_x_counter_clock_wise = true;
        TeaPot.rotate_y_clock_wise = false; 
        TeaPot.rotate_y_counter_clock_wise= false;
         TeaPot.stop=false; 
    }
    else if (event.keyCode == 90){
        TeaPot.rotate_x_clock_wise = false; 
        TeaPot.rotate_x_counter_clock_wise = false;
        TeaPot.rotate_y_clock_wise = false; 
        TeaPot.rotate_y_counter_clock_wise= false;
        TeaPot.stop=true; 
    }
    
    
    
    
}



















