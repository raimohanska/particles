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
	var radius = 20
	var renderer = ParticleRenderer(ctx, particles, bounds, [
		ParticleCircleRenderer(ctx, radius)
		,SlimeRenderer(ctx, radius)
	])
		
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
	return function(particle, otherParticle, cache) {
		var distanceVector = otherParticle.getLocation().subtract(particle.getLocation(), cache)
		var distance = distanceVector.getLength()
		var gravity = factor / distance
		return distanceVector.withLength(gravity, cache)
	}
}

function Liquidness() {
	return function(particle, otherParticle, cache) {
		var distanceVector = otherParticle.getLocation().subtract(particle.getLocation(), cache)
		var distance = distanceVector.getLength()
		var rejectionThreshold = 12
		var attractionThreshold = 30
		var neighbourhoodThreshold = 50
		if (distance < neighbourhoodThreshold) {
			particle.neighbour = otherParticle
			otherParticle.neighbour = undefined
			if (particle.temperature) {
				//particle.temperature = (particle.temperature + otherParticle.temperature) / 2
				//otherParticle.temperature = particle.temperature				
			}
		} else if (particle.neighbour == otherParticle && distance > neighbourhoodThreshold * 2) {
			particle.neighbour = undefined
		}
		if (distance < rejectionThreshold) {
			return distanceVector.withLength(-0.0001, cache)
		} else if (distance < attractionThreshold) {
			return distanceVector.withLength(+0.00002, cache)
		}
		return Vector2D(0, 0, cache)
	}
}


function Gravity(particles, gravityFunction, cache) {
	return function (particle, deltaTime, cache) {
		_.forEach(particles, function(otherParticle) {
			if (otherParticle != particle) {
				var gravitation = gravityFunction(particle, otherParticle, cache)
				particle.accelerate(gravitation, deltaTime, cache)
			}
		})
	}	
}

function Downforce() {
	return function(particle, deltaTime, cache) {
		var equilibriumTemperature = 100
		var diff = particle.temperature - equilibriumTemperature		
		particle.accelerate(Vector2D(0, -diff / 1000000, cache), deltaTime, cache)
	}
}

function Heater(bounds) {
	return function(particle, deltaTime, cache) {
		particle.temperature |= 0
		var lampPosition = Vector2D(bounds.x + bounds.width / 2, bounds.y + bounds.height, cache)
		var distanceFromLamp = particle.getLocation().subtract(lampPosition, cache).getLength() + 10
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
			var bounciness = 0
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
	function moveParticle(particle, deltaTime, cache) {
		functionsToApply.forEach(function(functionToApply) {
			functionToApply(particle, deltaTime, cache)
		})
		particle.move(deltaTime, cache)
	}
	var cache = Vector2D()
	return { move : function(deltaTime) {
		_.forEach(particles, function(particle) { moveParticle(particle, deltaTime, cache) })
	}}
}

function TemperatureColor(temperature) {
	if (temperature == 0) {
		return "rgba(0, 0, 0, 0.5)"			
	}
	green = Math.floor(Math.min(temperature, 256))
	return "rgba(256, " + green +", 0, 0.5)"	
}

// TODO ref
function FlashColor(temperature) {
	green = Math.floor(Math.min(temperature, 256))
	return "rgba(0, " + green +", 256, 0.5)"	
}


// CanvasRenderingContext2D -> Array<Particle> -> Rectangle -> ParticleRenderer
function ParticleRenderer(ctx, particles, bounds, renderers) {
	function render() {
		ctx.fillStyle = "rgb(0, 0, 0)";
		ctx.globalCompositeOperation='source-over'
		ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
		ctx.globalCompositeOperation='lighter'
		particles.forEach(function(particle) {
			renderers.forEach(function (renderer) {
				renderer(particle)
			})
		})
	}
	return { render : render }
}

function ParticleCircleRenderer(ctx, radius) {
	return function(particle) {
		var location = particle.getLocation()
		var colorCode = TemperatureColor(particle.temperature)
		ctx.strokeStyle = "rgba(0,0,0,0)";
		ctx.fillStyle = colorCode;
		ctx.beginPath();
		ctx.arc(location.x, location.y,radius,0,Math.PI*2,true);
		ctx.closePath();
		ctx.stroke();
		ctx.fill();		
	}
}

function SlimeRenderer(ctx, radius) {
	return function(particle) {
		var neighbour = particle.neighbour
		if (neighbour) {
			var colorCode = FlashColor((particle.temperature + neighbour.temperature) / 2)
			ctx.strokeStyle = "rgba(0,0,0,0)";
			ctx.fillStyle = colorCode;
			var pl = particle.getLocation()
			var nl = neighbour.getLocation()
			var distance = nl.subtract(pl)
			var tangent1 = distance.rotate(90).withLength(radius)
			var tangent2 = distance.rotate(-90).withLength(radius)
			var thickness = 0
			ctx.beginPath();
			var cp = nl.subtract(pl).times(.5).add(pl)
			move(pl.add(tangent1))
			curve(cp.add(tangent1.withLength(thickness)), nl.add(tangent1))
			ctx.arc(nl.x, nl.y, radius, tangent1.getAngle(), tangent2.getAngle(), true);			
			curve(cp.add(tangent2.withLength(thickness)), pl.add(tangent2))
			ctx.arc(pl.x, pl.y, radius, tangent2.getAngle(), tangent1.getAngle(), true)
			ctx.closePath()
			ctx.stroke()
			ctx.fill()
		}
		
		// Vector2D -> Vector2D -> Unit
		function line(to) {
			ctx.lineTo(to.x, to.y)			
		}
		
		// Vector2D -> Vector2D -> Unit
		function move(to) {
			ctx.moveTo(to.x, to.y)
		}		
		
		function curve(cp, to) {
			ctx.quadraticCurveTo(cp.x, cp.y, to.x, to.y)			
		}
	}
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
function Vector2D(x, y, cache) {
	if (cache) {
		cache.x = x
		cache.y = y
		return cache
	}
	return {
		x : x, 
		y : y,
		// Vector2D -> Vector2D
		add : function(other, cache) { return Vector2D(this.x + other.x, this.y + other.y, cache) },
		// Vector2D -> Vector2D
		subtract : function(other, cache) { return this.add(other.invert(cache), cache) },
		// Unit -> Number
		getLength : function() { return Math.sqrt(this.x * this.x + this.y * this.y) },
		// Number -> Vector2D
		times : function(multiplier, cache) { return Vector2D(this.x * multiplier, this.y * multiplier, cache) },
		// Unit -> Vector2D
		invert : function(cache) { return Vector2D(-this.x, -this.y, cache) },
		// Number -> Vector2D
		withLength : function(newLength, cache) { return this.times(newLength / this.getLength(), cache) },
		// Number -> Vector2D
		rotate : function(degrees, cache) {
			var radians = degrees * 2 * Math.PI / 360
			var length = this.getLength()			
			var currentRadians = this.getAngle(cache)
			var resultRadians = radians + currentRadians
			var rotatedUnit = Vector2D(Math.cos(resultRadians), Math.sin(resultRadians), cache)
			return rotatedUnit.withLength(length, cache)
		},
		// Unit -> Number
		getAngle : function(cache) {
			var length = this.getLength()
			unit = this.withLength(1, cache)
			return Math.atan2(unit.y, unit.x)			
		}
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
		accelerate : function(acceleration, deltaTime, cache) { velocity = velocity.add(acceleration.times(deltaTime, cache), velocity, cache) },
		// Number -> Unit
		move : function(deltaTime, cache) {
		    var deltaPos = velocity.times(deltaTime, cache) 
		    location = Vector2D(location.x + deltaPos.x, location.y + deltaPos.y, location)
		}
	}	
}