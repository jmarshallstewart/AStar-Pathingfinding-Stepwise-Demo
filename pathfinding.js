var openList = [];
var closedList = [];
var numNodesSearched = 0;
var path = null;

var statusSearching = 0;
var statusPathFound = 1;
var statusNoPathFound = 2;

function pathfindingInit() {
	openList = [];
	closedList = [];
	numNodesSearch = 0;
	
	path = null;
	status = statusSearching;
}

function PathfindingNode(row, col) {
	this.row = row;
	this.col = col;
	this.parent = null;
	this.f = 0;
	this.g = 0;
	this.h = 0;
}

// grid-based A* pathfinding.
function stepPath(startRow, startCol, endRow, endCol, numRows, numCols, grid) {

	if(openList.length > 0) {
	
		// find the node with the lowest cost and remove it from the open list.
		openList.sort( function(a,b) { return a.f - b.f; } );
		var currentNode = openList.shift();
		
		// if the current node is the destination, we're done. Return the node.
		if(currentNode.row == endRow && currentNode.col == endCol) {
			path = currentNode;
			return statusPathFound;
		}
		
		// add the lowest cost node to the closed list.
		closedList.push(currentNode);
		
		// search 8 neighboring nodes
		for(var r = -1; r <= 1; ++r) {
			for(var c = -1; c <= 1; ++c) {
				var nextRow = currentNode.row + r;
				var nextCol = currentNode.col + c;
				
				// if the neighbor is within the bounds of the grid...
				if (nextRow >= 0 && nextRow < numRows && nextCol >= 0 && nextCol < numCols) {
					
					// skip nodes that are not passable or are already on the closed list....
					var isPassable = grid[nextCol + nextRow * numCols] == 0;
					
					if ( isPassable && !isInList(nextRow, nextCol, closedList) ) {
						
						var gCost = currentNode.g + 1;
						var existingOpenNode = getFromList(nextRow, nextCol, openList);
						
						//if this neighbor node is not on open list, add it to the open list. Set its parent to currentNode.
						if ( existingOpenNode == null ) {
							var nextNode = new PathfindingNode(nextRow, nextCol);
							nextNode.parent = currentNode;
							nextNode.g = gCost;
							nextNode.h = getManhattanDistance(nextNode.row, nextNode.col, endRow, endCol);
							nextNode.f = nextNode.g + nextNode.h;
							openList.push(nextNode);
						// otherwise, check to see if currentNode offers a shorter path to the node that
						// is already in the open list. If so, set its parent to currentNode.
						} else if (gCost < existingOpenNode.g) {
							existingOpenNode.parent = currentNode;
							existingOpenNode.g = gCost;
							existingOpenNode.f = existingOpenNode.g + existingOpenNode.h;
						}
					}
				}
			}
		}
		
		return statusSearching;
	}
	else
	{
		return statusNoPathFound;
	}
}

function getFromList(row, col, list) {
	for(var i = 0; i < list.length; ++i) {
		if(list[i].row == row && list[i].col == col) {
			return list[i];
		}
	}
	
	return null;
}

function isInList(row, col, list) {
	return getFromList(row, col, list) != null;
}

function getManhattanDistance(startRow, startCol, endRow, endCol) {
    //return 0;
	return Math.abs(startRow - endRow) + Math.abs(startCol - endCol);
}
