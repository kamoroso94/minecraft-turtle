"use strict";

// globals
var GRID_WIDTH = 16;
var GRID_HEIGHT = 16;
var LIFE_SPAN = GRID_WIDTH;
var POP_SIZE = 1000;
var MUTATION_RATE = 0.001;
var TPS = 30;
var canvas, ctx, genTag, fitTag, bgTag, drawId, updateId, currentGen, genId, bestPheno, bestFit, cellWidth, cellHeight, frameDrawn;

// wait for page to load
window.addEventListener("load", function() {
	canvas = document.querySelector("canvas");
	ctx = canvas.getContext("2d");
	genTag = document.getElementById("generation");
	fitTag = document.getElementById("fitness");
	bgTag = document.getElementById("mc-bg");
	
	bgTag.addEventListener("change", function() {
		canvas.className = this.checked ? "minecraft" : "";
	});
	
	init();
	resume();
});

// initialize variables
function init() {
	currentGen = [];
	genId = 0;
	cellWidth = canvas.width / GRID_WIDTH;
	cellHeight = canvas.height / GRID_HEIGHT;
	frameDrawn = true;
	
	for(var i = 0; i < POP_SIZE; i++) {
		var turtle = new Turtle(0, 0, GRID_WIDTH, GRID_HEIGHT);
		
		turtle.initRandom();
		currentGen.push(turtle);
	}
}

// logic loop
function update() {
	if(frameDrawn) {
		generate();
		genTag.textContent = genId;
		fitTag.textContent = bestFit;
		frameDrawn = false;
	}
	
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
	if(frameDrawn) {
		return;
	}
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	for(var x = 0; x < bestPheno.width; x++) {
		for(var y = 0; y < bestPheno.height; y++) {
			var cell = bestPheno.get(x, y);
			// colored:
			var colors = [
				"0,0,0,1",
				"0,255,0,0.25",
				"170,255,0,0.25",
				"255,170,0,0.25",
				"255,0,0,0.25"
			];
			// grayscale:
			// var alpha = 1 - cell.neighbors / 5;
			
			if(!cell.flag) {
				// colored:
				ctx.fillStyle = "rgba(" + colors[cell.neighbors] + ")";
				// grayscale:
				// ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
				ctx.fillRect(cellWidth * x, cellHeight * y, cellWidth, cellHeight);
			}
		}
	}
	
	frameDrawn = true;
}

// evolve one generation
function generate() {
	var fitnesses = [];
	var nextGen = [];
	var maxFitPheno = null;
	var maxFitValue = -1;
	
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
	
	for(var i = 0; i < POP_SIZE; i++) {
		var parentA = currentGen[simulate(fitnesses)];
		var parentB = currentGen[simulate(fitnesses)];
		var child = parentA.crossover(parentB);
		
		child.mutate(MUTATION_RATE);
		nextGen.push(child);
	}
	
	bestPheno = maxFitPheno;
	bestFit = maxFitValue;
	currentGen = nextGen;
	genId++;
}

// helper function to simulate a probabilistic event
// accepts a list of likelihoods
// returns a probabilistically chosen index
function simulate(chances) {
	var rand, chance;
	var sum = 0;
	
	for(var i = 0; i < chances.length; i++) {
		sum += chances[i];
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
	
	return -1;
}

// the life form that will evolve
function Turtle(x, y, w, h) {
	this.origin = {x: x, y: y, z: 0};
	this.current = {x: x, y: y, z: 0};
	this.isDead = false;
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
		
		if(Math.random() < 0.5) {
			dest.x = Math.floor(this.grids[0].width * Math.random());
		} else {
			dest.y = Math.floor(this.grids[0].height * Math.random());
		}
		
		dest.z = Math.floor(this.grids.length * Math.random());
		
		return dest;
	};
	// simulate the life cycle
	this.run = function(neighborhood) {
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
				
				if(this.current.x != next.x) {
					this.current.x += this.current.x < next.x ? 1 : -1;
				}
				
				if(this.current.y != next.y) {
					this.current.y += this.current.y < next.y ? 1 : -1;
				}
			}
		}
		
		neighborhood.set(this.current.x, this.current.y, true);
		this.isDead = true;
	};
	// fitness function
	this.getFitness = function(neighborhood) {
		var counts = [0, 0, 0, 0, 0];
		var score = 0;
		var weight = 1;
		
		for(var x = 0; x < neighborhood.width; x++) {
			for(var y = 0; y < neighborhood.height; y++) {
				var current = neighborhood.get(x, y);
				if(current.flag) {
					counts[current.neighbors]++;
				}
			}
		}
		
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
					var dest = Math.random() < 0.5 ? this.grids[i].get(x, y) : turtle.grids[i].get(x, y);
					grid.set(x, y, dest);
				}
			}
		}
		
		return child;
	};
	// introduces variation into the genotype
	this.mutate = function(rate) {
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
