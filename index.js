//11,12, 13, 14
var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)

var enemies = []
var playerSpawnPoints = []
var clients = []

app.get('/', (req, res) => {
  res.send('test')
})

io.on('connection', (socket) => {
  var currentPlayer = {}
  currentPlayer.name = 'unknown'
  socket.on('player connect', () => {
    console.log(currentPlayer.name + 'recv: player connect')
    for (let i = 0; i < clients.length; i++) {
      var playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].position,
        health: clients[i].health
      }
      // in your current game, we nee to tell you about the other players.
      socket.emit('other player connected', playerConnected)
      console.log(currentPlayer.name + 'emit: other player connected:' + JSON.stringify(playerConnected))
    }
  })

  socket.on('player move', (data) => {
    console.log('recv: move: ' + JSON.stringify(data))
    currentPlayer.position = data.position
    socket.broadcast.emit('player move', currentPlayer)
  })

  socket.on('player turn', (data) => {
    console.log('recv: turn: ' + JSON.stringify(data))
    currentPlayer.rotation = data.rotation
    socket.broadcast.emit('player turn', currentPlayer)
  })

  socket.on('player shoot', () => {
    console.log(currentPlayer.name+'recv: shoot')
    var data = {
      name: currentPlayer.name
    }
    console.log(currentPlayer.name+'bcst: shoot: ' + JSON.stringify(data))
    socket.emit('player shoot', data)
    socket.broadcast.emit('player shoot', data)
  })

  socket.on('health', (data) => {
    console.log(currentPlayer.name+' recv: health: ' + JSON.stringify(data))
    // only change the health once, we can do this by checking the originating player
    if (data.from === currentPlayer.name) {
      var indexDamaged = 0
      if (!data.isEnemy) {
        clients = clients.map(function(client, index) {
          if (client.name === data.name) {
            indexDamaged = index
            client.health -= data.healthChange
          }
          return client
        })
      } else {
        enemies = enemies.map(function(enemy, index) {
          if (enemy.name === data.name) {
            indexDamaged = index
            enemy.health -= data.healthChange
          }
          return enemy
        })
      }

      var response = {
        name: (!data.isEnemy) ? clients[indexDamaged].name : enemies[indexDamaged].name,
        health: (!data.isEnemy) ? clients[indexDamaged].health : enemies[indexDamaged].health
      }
      console.log(currentPlayer.name+' bcst: health: ' + JSON.stringify(response))
      socket.emit('health', response)
      socket.broadcast.emit('health', response)
    }
  })

  socket.on('disconnect', function() {
    console.log(currentPlayer.name+' recv: disconnect ' + currentPlayer.name)
    socket.broadcast.emit('other player disconnected', currentPlayer)
    console.log(currentPlayer.name+' bcst: other player disconnected ' + JSON.stringify(currentPlayer))
    for (let i = 0; i<clients.length; i++) {
      if (clients[i].name === currentPlayer.name) {
        clients.splice(i,1)
      }
    }
  })

  socket.on('play', (data) => {
    console.log(currentPlayer.name + 'recv: play: ' + JSON.stringify(data))
    // if this is the first presion to join the game init the enemies
    if (clients.length === 0) {
      numberOfEnemies = data.enemySpawnPoints.length
      enemies = []
      data.enemySpawnPoints.forEach(function(enemySpawnPoint) {
        var enemy = {
          name: guid(),
          position: enemySpawnPoint.position,
          rotation: enemySpawnPoint.rotation,
          health: 100
        }
        enemies.push(enemy)
      })
      playerSpawnPoints = []
      data.playerSpawnPoints.forEach(function(playerSpawnPoint) {
        var playerSpawnPoint = {
          position: playerSpawnPoint.position,
          rotation: playerSpawnPoint.rotation
        }
        playerSpawnPoints.push(playerSpawnPoint)
      })
    }

    var enemiesResponse = {
      enemies: enemies
    }

    console.log(currentPlayer.name + 'emit: enemies: ' + JSON.stringify(enemiesResponse))
    socket.emit('enemies', enemiesResponse)
    var randomSpawnPoint = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)]
    currentPlayer = {
      name: data.name,
      position: randomSpawnPoint.position,
      rotation: randomSpawnPoint.rotation,
      health: 100
    }
    clients.push(currentPlayer)
    // in your current game, tell you that you have joined
    console.log(currentPlayer.name + ' emit: play: ' + JSON.stringify(currentPlayer))
    socket.emit('play', currentPlayer)
    // in your current game, we need to tell the other players about you.
    socket.broadcast.emit('other player connected', currentPlayer)
  })

  //end
})

server.listen(3000)
console.log('Started on port 3000...')

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
