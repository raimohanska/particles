function Lavalamp(canvas) {
	var ctx = canvas.get(0).getContext('2d')		
	var bounds = Rectangle(0, 0, 150, 500)
	var count = 100;
	
	var particles = Init(bounds, count)	
	var mover = ParticleMover(particles, [
		Gravity(particles, Liquidness() /*SimpleGravity(1 / 10000)*/), 
		Heater(bounds),
		Downforce(),
		BoundsChecker(bounds)]
	)
	//var renderer = PixelRenderer(ctx, particles, bounds) 
	var renderer = ParticleRenderer(ctx, particles, bounds)
		
	Updater(mover, renderer, 20)
}

function Init(bounds, count) {
	function randomParticle() {
		// Unit -> point
		function randomLocation() { 
			return Vector2D(bounds.x + Math.random() * bounds.width, bounds.y + bounds.height) 
		}
		return Particle(randomLocation(), Vector2D(0, 0), bounds)
	}
	return _.map(_.range(count), randomParticle)	
}

function Updater(mover, renderer, interval) {
	function updateParticles() {
		// TODO: regulate updates. updateParticles.previousUpdate |= new Date().getTime()
		renderer.render()
		mover.move(interval)
		setTimeout(updateParticles, interval)		
	}
	updateParticles()
}

// Number -> (Particle -> Particle -> Unit)
function SimpleGravity(factor) {
	return function(particle, otherParticle) {
		var distanceVector = otherParticle.getLocation().subtract(particle.getLocation())
		var distance = distanceVector.getLength()
		var gravity = factor / distance
		return distanceVector.withLength(gravity)
	}
}

function Liquidness() {
	return function(particle, otherParticle) {
		var distanceVector = otherParticle.getLocation().subtract(particle.getLocation())
		var distance = distanceVector.getLength()
		var rejectionThreshold = 12
		var attractionThreshold = 30
		if (distance < rejectionThreshold) {
			return distanceVector.withLength(-0.0001)
		} else if (distance < attractionThreshold) {
			return distanceVector.withLength(+0.00002)
		}
		return Vector2D(0, 0)
	}
}


function Gravity(particles, gravityFunction) {
	return function (particle, deltaTime) {
		_.forEach(particles, function(otherParticle) {
			if (otherParticle != particle) {
				var gravitation = gravityFunction(particle, otherParticle)
				particle.accelerate(gravitation, deltaTime)
			}
		})
	}	
}

function Downforce() {
	return function(particle, deltaTime) {
		var equilibriumTemperature = 100
		var diff = particle.temperature - equilibriumTemperature		
		particle.accelerate(Vector2D(0, -diff / 1000000), deltaTime)
	}
}

function Heater(bounds) {
	return function(particle, deltaTime) {
		particle.temperature |= 0
		var lampPosition = Vector2D(bounds.x + bounds.width / 2, bounds.y + bounds.height)
		var distanceFromLamp = particle.getLocation().subtract(lampPosition).getLength() + 10
		var ambientTemperature = 10000 / distanceFromLamp
		var diff = ambientTemperature - particle.temperature
		var conductivity = 0.005		
		particle.temperature = particle.temperature + diff * conductivity;
	}
}

function BoundsChecker(bounds) {
	function checkBounds(location, velocity, bounds) {
	    checkBound("x", location, velocity, bounds.x + bounds.width, true)
	    checkBound("x", location, velocity, bounds.x, false)
	    checkBound("y", location, velocity, bounds.y + bounds.height, true)
	    checkBound("y", location, velocity, bounds.y, false)	    
    	function checkBound(axis, location, velocity, bound, upper) {
            var boundDelta = location[axis] - bound
            if ((upper && boundDelta > 0) || (!upper && boundDelta < 0)) {
                bounce(axis, location, velocity, boundDelta)
            }
    	}
		function bounce(axis, location, velocity, boundDelta) {
			location[axis] = location[axis] - 2 * boundDelta
			var bounciness = 0.1
            velocity[axis] = -velocity[axis] * bounciness
		}
	}	
	return function(particle, deltaTime) {
		checkBounds(particle.getLocation(), particle.getVelocity(), bounds)
	}
}

// Array<Particle> -> Array<(Particle -> deltaTime -> Unit)> -> ParticleMover
// Optional arguments of type Particle -> deltaTime -> Unit
function ParticleMover(particles, functionsToApply) {
	function moveParticle(particle, deltaTime) {
		functionsToApply.forEach(function(functionToApply) {
			functionToApply(particle, deltaTime)
		})
		particle.move(deltaTime)
	}
	function moveParticles() {
		_.forEach(particles, moveParticle)
	}
	return { move : function(deltaTime) {
		_.forEach(particles, function(particle) { moveParticle(particle, deltaTime) })
	}}
}

function TemperatureColor(temperature) {
	if (temperature == 0) {
		return "rgba(0, 0, 0, 0.5)"			
	}
	green = Math.floor(Math.min(temperature, 256))
	return "rgba(256, " + green +", 0, 0.5)"	
}

// CanvasRenderingContext2D -> Array<Particle> -> Rectangle -> ParticleRenderer
function ParticleRenderer(ctx, particles, bounds) {
	function render() {
		var radius = 20
		function renderCircle(particle) {
			var location = particle.getLocation()
			var colorCode = TemperatureColor(particle.temperature)
			ctx.strokeStyle = colorCode;
			ctx.fillStyle = colorCode;
			ctx.beginPath();
			ctx.arc(location.x, location.y,radius,0,Math.PI*2,true);
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
		}
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
		_.forEach(particles, renderCircle)
	}
	return { render : render }
}

// CanvasRenderingContext2D -> Array<Particle> -> Rectangle -> PixelRenderer
function PixelRenderer(ctx, particles, bounds) {
	function render() {
		var pixelSize = 8
		for (var x = 0 ; x < bounds.width ; x += pixelSize) {
			for (var y = 0; y < bounds.height; y += pixelSize) {
				var heat = 0
				particles.forEach(function(particle) {
					var distance = particle.getLocation().subtract(Vector2D(x, y)).getLength()
					if (distance < pixelSize) {
						heat += particle.temperature
					}
				})
				ctx.fillStyle = TemperatureColor(heat)
				ctx.fillRect(x, y, pixelSize, pixelSize)				
			}
		}		
	}
	return { render : render }
}

function Rectangle(x, y, width, height) {
    return {x : x, y : y, width : width, height : height}
}

// Number -> Number -> Vector2D
function Vector2D(x, y) {
	return {
		x : x, 
		y : y,
		// Vector2D -> Vector2D
		add : function(other) { return Vector2D(this.x + other.x, this.y + other.y) },
		// Vector2D -> Vector2D
		subtract : function(other) { return this.add(other.invert()) },
		// Unit -> Number
		getLength : function() { return Math.sqrt(this.x * this.x + this.y * this.y) },
		// Number -> Vector2D
		times : function(multiplier) { return Vector2D(this.x * multiplier, this.y * multiplier) },
		// Unit -> Vector2D
		invert : function() { return Vector2D(-this.x, -this.y) },
		// Number -> Vector2D
		withLength : function(newLength) { return this.times(newLength / this.getLength()) }
	}
}

// Vector2D -> Rectangle -> Particle
function Particle(location, velocity, bounds) {
	return {
		// Unit -> Vector2D
		getLocation : function() { return location },
		// Unit -> Vector2D
		getVelocity : function() { return velocity},
		// Vector2D -> Unit
		accelerate : function(acceleration, deltaTime) { velocity = velocity.add(acceleration.times(deltaTime)) },
		// Number -> Unit
		move : function(deltaTime) {
		    var deltaPos = velocity.times(deltaTime) 
		    location = Vector2D(location.x + deltaPos.x, location.y + deltaPos.y)
		}
	}	
}