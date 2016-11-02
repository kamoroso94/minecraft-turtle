"use strict";

// globals
var GRID_WIDTH = 16;
var GRID_HEIGHT = 16;
var LIFE_SPAN = 12;
var POP_SIZE = 1024;
var MUTATION_RATE = 0.01;
var TPS = 5;
var canvas, ctx, genTag, fitTag, bgTag, coloredTag, drawId, updateId,
	currentGen, genId, bestPheno, bestFit, cellWidth, cellHeight, frameDrawn;

// wait for page to load
window.addEventListener("load", function() {
	var toggleTag;
	
	// get tag references
	canvas = document.getElementById("simulation").querySelector("canvas");
	ctx = canvas.getContext("2d");
	toggleTag = document.getElementById("toggle");
	genTag = document.getElementById("generation");
	fitTag = document.getElementById("fitness");
	bgTag = document.getElementById("background");
	coloredTag = document.getElementById("color");
	
	init();
	
	canvas.addEventListener("contextmenu", function(e) {
		e.preventDefault();
		return false;
	});
	
	document.getElementById("parameters").addEventListener("submit", function(e) {
		e.preventDefault();
		return false;
	});
	
	bgTag.addEventListener("change", function() {
		canvas.classList.toggle("minecraft", this.checked);
	});
	
	toggleTag.addEventListener("click", function() {
		var icon = this.querySelector("span");
		
		if(icon.classList.contains("glyphicon-play")) {
			// play
			resume();
			icon.classList.remove("glyphicon-play");
			icon.classList.add("glyphicon-pause");
		} else {
			// pause
			pause();
			icon.classList.remove("glyphicon-pause");
			icon.classList.add("glyphicon-play");
		}
	});
	
	document.getElementById("restart").addEventListener("click", function() {
		var icon = toggleTag.querySelector("span");
		
		// pause and reset
		pause();
		icon.classList.remove("glyphicon-pause");
		icon.classList.add("glyphicon-play");
		init();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		genTag.textContent = "N/A";
		fitTag.textContent = "N/A";
	});
});

// initialize variables
function init() {
	currentGen = [];
	genId = 0;
	cellWidth = canvas.width / GRID_WIDTH;
	cellHeight = canvas.height / GRID_HEIGHT;
	frameDrawn = true;
	
	canvas.classList.toggle("minecraft", bgTag.checked);
	
	// initialize population
	for(var i = 0; i < POP_SIZE; i++) {
		var turtle = new Turtle(0, 0, GRID_WIDTH, GRID_HEIGHT);
		
		turtle.initRandom();
		currentGen.push(turtle);
	}
}

// logic loop
function update() {
	// calculate next gen if last was displayed
	if(frameDrawn) {
		generate();
		genTag.textContent = genId;
		fitTag.textContent = bestFit;
		// mark frame undrawn
		frameDrawn = false;
	} else {
		console.log("skipped update");
	}
	
	// continue looping
	drawId = requestAnimationFrame(draw);
	updateId = setTimeout(update, 1000 / TPS);
}

function pause() {
	cancelAnimationFrame(drawId);
	clearTimeout(updateId);
}

function resume() {
	updateId = setTimeout(update, 1000 / TPS);
}

// show best fit phenotype
function draw() {
	// don't waste time redrawing
	if(frameDrawn) {
		console.log("skipped draw");
		return;
	}
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// shade each cell on canvas
	for(var x = 0; x < bestPheno.width; x++) {
		for(var y = 0; y < bestPheno.height; y++) {
			var cell = bestPheno.get(x, y);
			var colors = [
				"0,0,0,1",
				"0,255,0,0.25",
				"170,255,0,0.25",
				"255,170,0,0.25",
				"255,0,0,0.25"
			];
			var alpha = 1 - cell.neighbors / 5;
			
			if(!cell.flag) {
				if(coloredTag.checked) {
					ctx.fillStyle = "rgba(" + colors[cell.neighbors] + ")";
				} else {
					ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
				}
				
				ctx.fillRect(cellWidth * x, cellHeight * y, cellWidth, cellHeight);
			}
		}
	}
	
	// mark frame drawn
	frameDrawn = true;
}

// evolve one generation
function generate() {
	var fitnesses = [];
	var nextGen = [];
	var maxFitPheno = null;
	var maxFitValue = -1;
	
	// evaluate fitness
	for(var i = 0; i < POP_SIZE; i++) {
		var fitness;
		var turtle = currentGen[i];
		var neighborhood = new NeighborGrid(GRID_WIDTH, GRID_HEIGHT);
		
		turtle.run(neighborhood);
		fitness = turtle.getFitness(neighborhood);
		fitnesses.push(fitness);
		
		if(fitness > maxFitValue) {
			maxFitValue = fitness;
			maxFitPheno = neighborhood;
		}
	}
	
	// selection: crossover & mutation
	for(var i = 0; i < POP_SIZE; i++) {
		var parentA = currentGen[simulate(fitnesses)];
		var parentB = currentGen[simulate(fitnesses)];
		var child = parentA.crossover(parentB);
		
		child.mutate(MUTATION_RATE);
		nextGen.push(child);
	}
	
	// update best values
	bestPheno = maxFitPheno;
	bestFit = maxFitValue;
	currentGen = nextGen;
	genId++;
}

// helper function to simulate a probabilistic event
// accepts a list of likelihoods
// returns a probabilistically chosen index
// https://youtu.be/MGTQWV1VfWk
function simulate(chances) {
	var rand, chance;
	var sum = 0;
	
	for(var i = 0; i < chances.length; i++) {
		chance = chances[i];
		
		// error bad chance value
		if(chance < 0) {
			return -1;
		}
		
		sum += chance;
	}
	
	if(sum == 0) {
		return Math.floor(Math.random() * chances.length);
	}
	
	rand = Math.random();
	chance = 0;
	
	for(var i = 0; i < chances.length; i++) {
		chance += chances[i] / sum;
		
		if(rand < chance) {
			return i;
		}
	}
	
	// obsolete return
	return -1;
}

// the life form that will evolve
function Turtle(x, y, w, h) {
	this.origin = {x: x, y: y, z: 0};
	this.current = {x: x, y: y, z: 0};
	this.isDead = false;
	// makes cycles less likely
	this.grids = [
		new Grid(w, h),
		new Grid(w, h)
	];
	
	// initialize to valid random values
	this.initRandom = function() {
		var x = Math.floor(this.grids[0].width / 2 * Math.random());
		var y = 0;
		
		this.origin.x = x;
		this.origin.y = y;
		this.current.x = x;
		this.current.y = y;
		
		// initialize grid maps
		for(var i = 0; i < this.grids.length; i++) {
			var grid = this.grids[i];
			
			for(x = 0; x < grid.width; x++) {
				for(y = 0; y < grid.height; y++) {
					grid.set(x, y, this.randomDest(x, y));
				}
			}
		}
	};
	// compute a random adjacent destination given a location
	this.randomDest = function(x, y) {
		var dest = {x: x, y: y, z: 0};
		
		// move horizontally or vertically
		if(Math.random() < 0.5) {
			dest.x = Math.floor(this.grids[0].width * Math.random());
		} else {
			dest.y = Math.floor(this.grids[0].height * Math.random());
		}
		
		// pick random grid map to use
		dest.z = Math.floor(this.grids.length * Math.random());
		
		return dest;
	};
	// simulate the life cycle: calculate phenotype from genotype
	this.run = function(neighborhood) {
		// only meant to run once
		if(this.isDead) {
			return;
		}
		
		// flag lines
		for(var i = 0; i < LIFE_SPAN; i++) {
			var next = this.grids[this.current.z].get(this.current.x, this.current.y);
			
			this.current.z = next.z;
			
			// flag from point to point
			while(this.current.x != next.x || this.current.y != next.y) {
				neighborhood.set(this.current.x, this.current.y, true);
				
				// horizontal movement
				if(this.current.x != next.x) {
					this.current.x += this.current.x < next.x ? 1 : -1;
				}
				
				// vertical movement
				if(this.current.y != next.y) {
					this.current.y += this.current.y < next.y ? 1 : -1;
				}
			}
		}
		
		// flag last cell (left unflagged)
		neighborhood.set(this.current.x, this.current.y, true);
		// kill turtle
		this.isDead = true;
	};
	// fitness function: evaluates phenotype
	this.getFitness = function(neighborhood) {
		var counts = [0, 0, 0, 0, 0];
		var score = 0;
		var weight = 1;
		
		// count all cells with certain number of neighboring tunnel cells
		for(var x = 0; x < neighborhood.width; x++) {
			for(var y = 0; y < neighborhood.height; y++) {
				var current = neighborhood.get(x, y);
				
				// count neighboring tunnel cells
				if(!current.flag) {
					counts[current.neighbors]++;
				}
			}
		}
		
		// cells seen from fewer tunnel cells is better
		for(var i = 1; i <= 4; i++) {
			score += weight * counts[i];
			weight /= 2;
		}
		
		return score;
	};
	// produces an offspring with a mixed genotype of its parents
	this.crossover = function(turtle) {
		var x = Math.random() < 0.5 ? this.origin.x : turtle.origin.x;
		var child = new Turtle(x, 0, this.grids[0].width, this.grids[0].height);
		
		for(var i = 0; i < child.grids.length; i++) {
			var grid = child.grids[i];
			
			for(x = 0; x < grid.width; x++) {
				for(var y = 0; y < grid.height; y++) {
					// perform uniform crossover
					var dest = Math.random() < 0.5 ? this.grids[i].get(x, y) : turtle.grids[i].get(x, y);
					
					grid.set(x, y, dest);
				}
			}
		}
		
		return child;
	};
	// introduces variation into the genotype
	this.mutate = function(rate) {
		var w = this.grids[0].width;
		var h = this.grids[0].height;
		
		for(var i = 0; i < this.grids.length; i++) {
			var grid = this.grids[i];
			
			for(var x = 0; x < grid.width; x++) {
				for(var y = 0; y < grid.height; y++) {
					if(Math.random() < rate) {
						grid.set(x, y, this.randomDest(x, y));
					}
				}
			}
		}
	};
}

// 2D data structure that keeps track of how many adjacent grid spaces are flagged
function NeighborGrid(w, h) {
	this.width = w;
	this.height = h;
	this.grid = new Grid(w, h);
	
	for(var x = 0; x < w; x++) {
		for(var y = 0; y < h; y++) {
			this.grid.set(x, y, {neighbors: 0, flag: false});
		}
	}
	
	this.get = function(x, y) {
		return this.grid.get(x, y);
	};
	this.set = function(x, y, flag) {
		var cell = this.grid.get(x, y);
		
		if(cell.flag == flag) {
			return;
		}
		
		cell.flag = flag;
		
		// update NWSE neighbors
		for(var i = 1; i < 9; i += 2) {
			var h = i % 3 - 1;
			var k = Math.floor(i / 3) - 1;
			
			if(x + h >= 0 && x + h < this.width && y + k >= 0 && y + k < this.height) {
				this.grid.get(x + h, y + k).neighbors += flag ? 1 : -1;
			}
		}
	};
}

// 2D data structure for holding data
function Grid(w, h) {
	this.width = w;
	this.height = h;
	this.array = new Array(w * h);
	
	this.get = function(x, y) {
		if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
			return this.array[y * this.width + x];
		}
		
		throw new Error("Index out of bounds: (" + x + "," + y + ")");
	};
	this.set = function(x, y, val) {
		if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.array[y * this.width + x] = val;
			return;
		}
		
		throw new Error("Index out of bounds: (" + x + "," + y + ")");
	};
}