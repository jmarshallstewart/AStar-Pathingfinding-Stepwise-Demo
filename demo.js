var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

context.font = "14pt Courier";

canvas.addEventListener('mouseout', function() { isPainting = false; }, false);
canvas.addEventListener('mousemove', onMouseMove, false);
canvas.addEventListener('mousedown', function(event) { isPainting = true; event.preventDefault(); paint(event); }, false);
canvas.addEventListener('mouseup', function() { isPainting = false; }, false);
		
canvas.addEventListener('click', onMouseClick, false);
			
var xPadding = 16;
var yPadding = 16;
var tileSize = 64;

var numRows = 8;
var numCols = 8;

var tiles = [];
var walkabilityGrid = [];

var isPainting = false;

reset();

var pathToDraw = null;

var startColor = "#FED85D";
var endColor = "#0000EE";
var obstacleColor = "#888888";

//function DemoState(instructions, color, shouldHideButton, clickHandler, buttonText, mouseClickHandler) {
var setStartState = new DemoState("Click a square to set the path start.", "#FED85D", true, null, "", onMouseClickSetStart);
var setGoalState = new DemoState("Click a square to set the path goal.", "#EE0000", true, null, "", onMouseClickSetGoal);
var setObstaclesState = new DemoState("Click and drag the mouse to draw obstacles. Press the button below when finished.", "#888888", false, onButtonClickedSetObstacles, "I am finished placing obstacles.", null);
var searchState = new DemoState("Click the button below to advance the search by one iteration.", "#0000EE", false, onButtonClickedSearch, "Step Search");
var pathFoundState = new DemoState("Path found! Click the button below to start over.", "", false, onButtonClickedSearchFinished, "Start Over");
var noPathFoundState = new DemoState("No path could be found. Click the button below to start over.", "", false, onButtonClickedSearchFinished, "Start Over");

enterState(setStartState);

//search params
var startRow = -1;
var startCol = -1;
var endRow = -1;
var endCol = -1;

// state functions

function onMouseClickSetStart(event) {
	var coords = getMouseCoords(event);
		
	if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
		return;
	}
		
	var col = Math.floor(coords.x / tileSize);
	var row = Math.floor(coords.y / tileSize);
	
	tiles[col + row * numCols] = currentState.color;
	
	startRow = row;
	startCol = col;
	
	enterState(setGoalState);
	
	draw();
}

function onMouseClickSetGoal(event) {
	var coords = getMouseCoords(event);
		
	if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
		return;
	}
		
	var col = Math.floor(coords.x / tileSize);
	var row = Math.floor(coords.y / tileSize);
	
	if(col === startCol && row === startRow) {
		return;
	}
	
	tiles[col + row * numCols] = currentState.color;
	
	endRow = row;
	endCol = col;
	
	enterState(setObstaclesState);
	
	draw();
}

function onButtonClickedSetObstacles() {
	pathfindingInit();
	openList.push( new PathfindingNode(startRow, startCol) );
	enterState(searchState);
	drawSearch();
}

function onButtonClickedSearch() {
	stepSearch();
}

function onButtonClickedSearchFinished() {
	reset();
	enterState(setStartState);
}

// end state functions

function DemoState(instructions, color, shouldHideButton, clickHandler, buttonText, mouseClickHandler) {
	this.instructions = instructions;
	this.color = color;
	this.hideButton = shouldHideButton;
	this.onButtonClick = clickHandler;
	this.buttonText = buttonText;
	this.mouseClickHandler = mouseClickHandler;
}

function enterState(nextState) {
	
	context.clearRect(0, 0, canvas.width, canvas.height);

	currentState = nextState;
	
	document.getElementById("instructionText").innerHTML = nextState.instructions;
	document.getElementById("stateButton").innerHTML = nextState.buttonText;
	
	if(nextState.hideButton) {
		document.getElementById("stateButton").style.visibility = "hidden";
	} else {
		document.getElementById("stateButton").style.visibility = "visible";
	}
	
	draw();
}

function onMouseClick(event) {
	if(currentState !== undefined && currentState !== null) {
		if(currentState.mouseClickHandler != undefined && currentState.mouseClickHandler != null) {
			currentState.mouseClickHandler(event);
		}
	}
}

function onButtonClick() {
	if(currentState !== undefined && currentState !== null) {
		if(currentState.onButtonClick != undefined && currentState.onButtonClick != null) {
			currentState.onButtonClick();
		}
	}
}

function getMouseCoords(e) {
	var x;
	var y;
	if (e.pageX || e.pageY) { 
		x = e.pageX;
		y = e.pageY;
	} else { 
		x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
		y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
	} 
	
	x -= canvas.offsetLeft;
	y -= canvas.offsetTop;
	
	x -= xPadding;
	y -= yPadding;
	
	return { x : x, y : y };
}

function draw() {
	drawTiles();
	drawGrid();
	
	while(pathToDraw !== null) {
		context.fillStyle = "rgba(200, 10, 200, 0.75)";
		context.fillRect(xPadding + pathToDraw.col * tileSize, yPadding + pathToDraw.row * tileSize, tileSize, tileSize);
		pathToDraw = pathToDraw.parent;
	}
}

function drawTiles() {
	context.beginPath();
					
	for(var r = 0; r < numRows; ++r) {
		for(var c = 0; c < numCols; ++c) {
			context.fillStyle = tiles[c + r * numRows];
			context.fillRect(xPadding + c * tileSize, yPadding + r * tileSize, tileSize, tileSize);
		}
	}
					
	context.closePath();
}

function drawGrid() {
	context.lineWidth = 1;

	context.beginPath();
	context.strokeStyle = "#000000";

	for(var r = 0; r <= numRows; ++r) {
		context.moveTo(xPadding, yPadding + r * tileSize);
		context.lineTo(xPadding + numCols * tileSize, yPadding + r * tileSize);
	}

	for(var c = 0; c <= numCols; ++c) {
		context.moveTo(xPadding + c * tileSize, yPadding);
		context.lineTo(xPadding + c * tileSize, yPadding + numRows * tileSize);
	}

	context.stroke();
	context.closePath();
}

function onMouseMove(event) {
	if(isPainting) {
		paint(event);
	}
}

function paint(event) {
	if(currentState !== setObstaclesState) {
		return;
	}

	var coords = getMouseCoords(event);
	
	if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
		return;
	}
		
	var col = Math.floor(coords.x / tileSize);
	var row = Math.floor(coords.y / tileSize);
	
	if(col === startCol && row === startRow) {
		return;
	}
	
	if(col === endCol && row === endRow) {
		return;
	}
		
	tiles[col + row * numCols] = currentState.color;
	walkabilityGrid[col + row * numCols] = 1;
	draw();
}

function reset() {
	tiles = [];
	walkabilityGrid = [];

	for(var r = 0; r < numRows; ++r) {
		for(var c = 0; c < numCols; ++c) {
			tiles.push("#FFFFFF");
			walkabilityGrid.push(0);
		}
	}

	isPainting = false;
	pathToDraw = null;
}	

function stepSearch() {
	var result = stepPath(startRow, startCol, endRow, endCol, numRows, numCols, walkabilityGrid);
	drawSearch();
	
	switch(result) {
		case statusSearching:
			break;
		case statusPathFound:
			pathToDraw = path;
			pathfindingInit();
			enterState(pathFoundState);
			break;
		case statusNoPathFound:
			pathfindingInit();
			enterState(noPathFoundState);
			break;
	}
}

function drawSearch() {
	
	draw();
	
    // draw open and closed lists in different colors.
    
	for(var i = 0; i < openList.length; ++i) {
		context.fillStyle = "rgba(0, 200, 0, 0.6)";
		context.fillRect(xPadding + openList[i].col * tileSize, yPadding + openList[i].row * tileSize, tileSize, tileSize);
		
		drawNodeText(openList[i]);
	}
	
	for(var i = 0; i < closedList.length; ++i) {
		context.fillStyle = "rgba(200, 0, 0, 0.6)";
		context.fillRect(xPadding + closedList[i].col * tileSize, yPadding + closedList[i].row * tileSize, tileSize, tileSize);
		
		drawNodeText(closedList[i]);
	}
}

function drawNodeText(node) {
	var yOffset = 14;
	var left = xPadding + node.col * tileSize;
	var top = yPadding + node.row * tileSize;
	
	if(node.parent !== null) {
		context.lineWidth = 5;
		context.beginPath();
		context.strokeStyle = "#FED85D";
	
		//draw the line pointing in the direction of this node's parent
		if(node.parent.col < node.col && node.parent.row == node.row) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left, top + tileSize / 2);
		} else if(node.parent.col > node.col && node.parent.row == node.row) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left + tileSize, top + tileSize / 2);
		} else if(node.parent.row > node.row && node.parent.col == node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left + tileSize / 2, top + tileSize);
		} else if(node.parent.row < node.row && node.parent.col == node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left + tileSize / 2, top);
		} else if(node.parent.row > node.row && node.parent.col > node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left + tileSize, top + tileSize);
		} else if(node.parent.row < node.row && node.parent.col < node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left, top);
		} else if(node.parent.row < node.row && node.parent.col > node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left + tileSize, top);
		} else if(node.parent.row > node.row && node.parent.col < node.col) {
			context.moveTo(left + tileSize / 2, top + tileSize / 2);
			context.lineTo(left, top + tileSize);
		}
		
		context.stroke();
		context.closePath();
	}
	
    context.fillStyle = "rgba(0, 0, 0, 1)";
    context.fillText("F: " + node.f, left, yOffset + top);
    context.fillText("G: " + node.g, left, yOffset * 2 + top);
    context.fillText("H: " + node.h, left, yOffset * 3 + top);
}
