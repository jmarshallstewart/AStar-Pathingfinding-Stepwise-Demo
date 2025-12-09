"use strict";

const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const instructionTextElement = document.getElementById("instructionText");
const stateButtonElement = document.getElementById("stateButton");

context.font = "12pt Courier";

canvas.addEventListener('mouseout', function() { isPainting = false; }, false);
canvas.addEventListener('mousemove', onMouseMove, false);
canvas.addEventListener('mousedown', function(event) { isPainting = true; event.preventDefault(); paint(event); }, false);
canvas.addEventListener('mouseup', function() { isPainting = false; }, false);
        
canvas.addEventListener('click', onMouseClick, false);
            
const xPadding = 16;
const yPadding = 16;
const tileSize = 64;

const numRows = 8;
const numCols = 8;

const startColor = "#FED85D";
const endColor = "#0000EE";
const obstacleColor = "#888888";

let tiles = [];
let walkabilityGrid = [];
let pathToDraw = null;

let currentState = null;
let isPainting = false;

reset();

//function DemoState(instructions, color, shouldHideButton, clickHandler, buttonText, mouseClickHandler) {
const setStartState = new DemoState("Click a square to set the path start.", "#FED85D", true, null, "", onMouseClickSetStart);
const setGoalState = new DemoState("Click a square to set the path goal.", "#EE0000", true, null, "", onMouseClickSetGoal);
const setObstaclesState = new DemoState("Click and drag the mouse to draw obstacles. Press the button below when finished.", "#888888", false, onButtonClickedSetObstacles, "I am finished placing obstacles.", null);
const searchState = new DemoState("Click the button below to advance the search by one iteration.", "#0000EE", false, onButtonClickedSearch, "Step Search");
const pathFoundState = new DemoState("Path found! Click the button below to start over.", "", false, onButtonClickedSearchFinished, "Start Over");
const noPathFoundState = new DemoState("No path could be found. Click the button below to start over.", "", false, onButtonClickedSearchFinished, "Start Over");

enterState(setStartState);

//search params
let startRow = -1;
let startCol = -1;
let endRow = -1;
let endCol = -1;

// state functions

function onMouseClickSetStart(event) {
    let coords = getMouseCoords(event);
        
    if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
        return;
    }
        
    let col = Math.floor(coords.x / tileSize);
    let row = Math.floor(coords.y / tileSize);
    
    tiles[col + row * numCols] = currentState.color;
    
    startRow = row;
    startCol = col;
    
    enterState(setGoalState);
    
    draw();
}

function onMouseClickSetGoal(event) {
    let coords = getMouseCoords(event);
        
    if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
        return;
    }
        
    let col = Math.floor(coords.x / tileSize);
    let row = Math.floor(coords.y / tileSize);
    
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
    
    instructionTextElement.innerHTML = nextState.instructions;
    stateButtonElement.innerHTML = nextState.buttonText;
    
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
    return { x : e.offsetX, y : e.offsetY };
}

function draw() {
    drawTiles();
    drawGrid();
    
    if (pathToDraw !== null) {
        let pathIterator = pathToDraw;
        while(pathIterator !== null) {
            context.fillStyle = "rgba(200, 10, 200, 0.75)";
            context.fillRect(xPadding + pathIterator.col * tileSize, yPadding + pathIterator.row * tileSize, tileSize, tileSize);
            pathIterator = pathIterator.parent;
        }
    }
}

function drawTiles() {
    context.beginPath();
                    
    for(let r = 0; r < numRows; ++r) {
        for(let c = 0; c < numCols; ++c) {
            context.fillStyle = tiles[c + r * numCols];
            context.fillRect(xPadding + c * tileSize, yPadding + r * tileSize, tileSize, tileSize);
        }
    }
                    
    context.closePath();
}

function drawGrid() {
    context.lineWidth = 1;

    context.beginPath();
    context.strokeStyle = "#000000";

    for(let r = 0; r <= numRows; ++r) {
        context.moveTo(xPadding, yPadding + r * tileSize);
        context.lineTo(xPadding + numCols * tileSize, yPadding + r * tileSize);
    }

    for(let c = 0; c <= numCols; ++c) {
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

    let coords = getMouseCoords(event);
    
    if(coords.x < 0 || coords.y < 0 || coords.x >= numCols * tileSize || coords.y >= numRows * tileSize) {
        return;
    }
        
    let col = Math.floor(coords.x / tileSize);
    let row = Math.floor(coords.y / tileSize);
    
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

    for(let r = 0; r < numRows; ++r) {
        for(let c = 0; c < numCols; ++c) {
            tiles.push("#FFFFFF");
            walkabilityGrid.push(0);
        }
    }

    isPainting = false;
    pathToDraw = null;
}   

function stepSearch() {
    let result = stepPath(startRow, startCol, endRow, endCol, numRows, numCols, walkabilityGrid);
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
    
    for(let i = 0; i < openList.length; ++i) {
        context.fillStyle = "rgba(0, 200, 0, 0.6)";
        context.fillRect(xPadding + openList[i].col * tileSize, yPadding + openList[i].row * tileSize, tileSize, tileSize);
        
        drawNodeText(openList[i]);
    }
    
    for(let i = 0; i < closedList.length; ++i) {
        context.fillStyle = "rgba(200, 0, 0, 0.6)";
        context.fillRect(xPadding + closedList[i].col * tileSize, yPadding + closedList[i].row * tileSize, tileSize, tileSize);
        
        drawNodeText(closedList[i]);
    }
}

function drawNodeText(node) {
    let yOffset = 14;
    let left = xPadding + node.col * tileSize;
    let top = yPadding + node.row * tileSize;
    
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
    context.fillText("F:" + node.f.toFixed(1), left, yOffset + top);
    context.fillText("G:" + node.g.toFixed(1), left, yOffset * 2 + top);
    context.fillText("H:" + node.h.toFixed(1), left, yOffset * 3 + top);
}
