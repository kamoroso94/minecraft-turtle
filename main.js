function Turtle(x, y, w, h) {
	this.x = x;
	this.y = y;
	this.z = 0;
	this.grids = [
		new Grid(w, h),
		new Grid(w, h),
		new Grid(w, h)
	];
	
	this.initRandom = function() {
		var x, y;
		
		if(Math.random() < 0.5) {
			x = Math.floor(this.grid.width * Math.random());
			y = Math.random() < 0.5 ? 0 : this.grid.height - 1;
		} else {
			x = Math.random() < 0.5 ? 0 : this.grid.width - 1;
			y = Math.floor(this.grid.height * Math.random());
		}
		
		this.x = x;
		this.y = y;
		
		for(x = 0; x < this.grid.width; x++) {
			for(y = 0; y < this.grid.height; y++) {
				var dir = Math.floor(4 * Math.random());
				var dist, dx, dy, dz;
				
				switch(dir) {
					case 0:
						dist = x + Math.floor((this.grid.width - x) * Math.random());
						break;
					case 1:
						dist = Math.floor(y * Math.random());
						break;
					case 2:
						dist = Math.floor(y * Math.random());
						break;
					case 3:
						dist = y + Math.floor((this.grid.height - y) * Math.random());
						break;
				}
				
				this.grid.set(x, y, {dir: dir, dist: dist});
			}
		}
	};
}

function NeighborGrid(w, h) {
	this.width = w;
	this.h = h;
	this.grid = new Grid(w, h);
	this.grid.fill({neighbors: 0, flag: false});
	
	this.get = function(x, y) {
		return this.grid.get(x, y);
	};
	this.set = function(x, y, flag) {
		var element = this.grid.get(x, y);
		if(element.flag == flag) {
			return;
		}
		
		element.neighbors += flag ? 1 : -1;
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
		if(this.indexOutOfBounds(x, y)) {
			throw new Error("Index out of bounds!");
		}
		return this.array[y * this.width + x];
	};
	this.set = function(x, y, val) {
		if(this.indexOutOfBounds(x, y)) {
			throw new Error("Index out of bounds!");
		}
		this.array[y * this.width + x] = v;
	};
	this.fill = function(val) {
		this.array.forEach(function(v, i, a) {
			a[i] = val;
		});
	};
	this.indexOutOfBounds = function(x, y) {
		return x < 0 || x >= this.width || y < 0 || y >= this.height;
	};
}