var GRID_WIDTH = 16;
var GRID_HEIGHT = 16;
var LIFE_SPAN = GRID_WIDTH * GRID_HEIGHT;
var POP_SIZE = 1000;
var MUTATION_RATE = 0.01;
var currentGen;

function evolve() {
	currentGen = [];
	
	for(var i = 0; i < POP_SIZE; i++) {
		var turtle = new Turtle(0, 0, GRID_WIDTH, GRID_HEIGHT);
		turtle.initRandom();
		currentGen.push(turtle);
	}
	
	generate();
}

function generate() {
	var neighborhood = new NeighborGrid(GRID_WIDTH, GRID_HEIGHT);
	var fitnesses = [];
	var nextGen = [];
	
	for(var i = 0; i < POP_SIZE; i++) {
		var turtle = currentGen[i];
		
		turtle.run(neighborhood);
		fitnesses.push(turtle.getFitness(neighborhood));
	}
	
	for(var i = 0; i < POP_SIZE; i++) {
		var parentA = currentGen[simulate(fitnesses)];
		var parentB, child;
		
		do {
			parentB = currentGen[simulate(fitnesses)];
		} while(parentA == parentB);
		
		child = parentA.crossover(parentB);
		child.mutate(MUTATION_RATE);
		nextGen.push(child);
	}
	
	currentGen = nextGen;
}

function simulate(chances) {
	var sum = 0;
	for(var i=0; i<chances.length; i++) {
		sum+=chances[i];
	}
	if(sum==0) {
		return Math.floor(Math.random()*chances.length);
	}
	var rand = Math.random();
	var chance = 0;
	for(var i=0; i<chances.length; i++) {
		chance+=chances[i]/sum;
		if(rand<chance) {
			return i;
		}
	}
	return -1;
}

function Turtle(x, y, w, h) {
	this.origin = {x: x, y: y, z: 1};
	this.current = {x: x, y: y, z: 1};
	this.isDead = false;
	this.grids = [
		new Grid(w, h),
		new Grid(w, h),
		new Grid(w, h)
	];
	
	this.initRandom = function() {
		var x = Math.floor(this.width / 2 * Math.random());
		var y = 0;
		
		this.origin.x = x;
		this.origin.y = y;
		this.current.x = x;
		this.current.y = y;
		
		for(var i = 0; i < this.grids.length; i++) {
			var grid = this.grids[i];
			
			for(x = 0; x < grid.width; x++) {
				for(y = 0; y < grid.height; y++) {
					grid.set(x, y, this.randomDest(x, y, i));
				}
			}
		}
	};
	this.randomDest = function(x, y, z) {
		var dest = {x: x, y: y, z: z};
		var rand = Math.random();
		
		if(rand < 0.25) {
			dest.x = x + Math.floor((grid.width - x) * Math.random());
		} else if(rand < 0.5) {
			dest.y = Math.floor(y * Math.random());
		} else if(rand < 0.75) {
			dest.x = Math.floor(x * Math.random());
		} else {
			dest.y = y + Math.floor((grid.height - y) * Math.random());
		}
		
		dest.z += Math.floor(3 * Math.random()) - 1;
		dest.z = Math.max(0, Math.min(dest.z, 2));
		
		return dest;
	};
	this.run = function(neighborhood) {
		if(this.isDead) {
			return;
		}
		
		neighborhood.set(this.current.x, this.current.y, true);
		
		for(var i = 1; i < LIFE_SPAN; i++) {
			var next = this.grids[this.current.z].get(this.current.x, this.current.y);
			this.current.x = next.x;
			this.current.y = next.y;
			this.current.z = next.z;
			neighborhood.set(this.current.x, this.current.y, true);
		}
		
		this.isDead = true;
	};
	this.getFitness = function(neighborhood) {
		var counts = [];
		
		for(var i = 0; i <= 4; i++) {
			counts.push(0);
		}
		
		for(var x = 0; x < neighborhood.width; x++) {
			for(var y = 0; y < neighborhood.height; y++) {
				var current = neighborhood.get(x, y);
				if(current.flag) {
					counts[current.neighbors]++;
				}
			}
		}
		
		return counts[1] + 0.5 * counts[2] + 0.25 * counts[3];
	};
	this.crossover = function(turtle) {
		var x = Math.random() < 0.5 ? this.origin.x : turtle.origin.x;
		var child = new Turtle(x, 0, this.grids[0].width, this.grids[0].height);
		
		for(var i = 0; i < child.grids.length; i++) {
			var grid = child.grids[i];
			
			for(x = 0; x < grid.width; x++) {
				for(y = 0; y < grid.height; y++) {
					var dest = Math.random() < 0.5 ? this.grids[i].get(x, y) : turtle.grids[i].get(x, y);
					grid.set(x, y, dest);
				}
			}
		}
	};
	this.mutate = function(rate) {
		for(var i = 0; i < this.grids.length; i++) {
			var grid = this.grids[i];
			
			for(x = 0; x < grid.width; x++) {
				for(y = 0; y < grid.height; y++) {
					if(Math.random() < rate) {
						grid.set(x, y, this.randomDest(x, y, i));
					}
				}
			}
		}
	};
}

function NeighborGrid(w, h) {
	this.width = w;
	this.h = h;
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
		var element = this.grid.get(x, y);
		
		if(element.flag == flag) {
			return;
		}
		
		element.flag = flag;
		
		for(var i = 1; i < 9; i += 2) {
			var h = i % 3 - 1;
			var k = Math.floor(i / 3) - 1;
			var current = this.grid.get(x + h, y + k);
			
			if(x + h >= 0 && x + h < this.width && y + k >= 0 && y + k < this.height) {
				current.neighbors += flag ? 1 : -1;
			}
		}
	};
}

function Grid(w, h) {
	this.width = w;
	this.height = h;
	this.array = new Array(w * h);
	
	this.get = function(x, y) {
		if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
			return this.array[y * this.width + x];
		}
		return null;
	};
	this.set = function(x, y, val) {
		if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
			this.array[y * this.width + x] = v;
		}
	};
	this.fill = function(callback) {
		this.array.forEach(function(v, i, a) {
			a[i] = val;
		});
	};
}