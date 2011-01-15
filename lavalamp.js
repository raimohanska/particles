function Lavalamp(canvas) {
	var ctx = canvas.get(0).getContext('2d')		
	var bounds = Rectangle(0, 0, 150, 500)
	var count = 100;
	
	var particles = Init(bounds, count)	
	var mover = ParticleMover(particles, [
		Gravity(particles, SimpleGravity(1 / 10000)), 
		BoundsChecker(bounds)]
	)
	var renderer = ParticleRenderer(ctx, particles, bounds)
		
	Updater(mover, renderer, 20)
}

function Init(bounds, count) {
	function randomParticle() {
		// Unit -> point
		function randomLocation() { 
			return Vector2D(bounds.x + Math.random() * bounds.width, bounds.y + Math.random() * bounds.height) 
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

// CanvasRenderingContext2D -> Array<Particle> -> Rectangle -> ParticleRenderer
function ParticleRenderer(ctx, particles, bounds) {
	function render() {
		function renderRectangle(particle) {
			ctx.fillStyle = "rgba(256, 256, 0, 0.5)";
			var location = particle.getLocation()
			ctx.fillRect(location.x, location.y, 10, 10)			
		}
		function renderCircle(particle) {
			var location = particle.getLocation()
			ctx.strokeStyle = "rgba(256, 256, 0, 0.5)";
			ctx.fillStyle = "rgba(256, 256, 0, 0.5)";
			ctx.beginPath();
			ctx.arc(location.x, location.y,10,0,Math.PI*2,true);
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