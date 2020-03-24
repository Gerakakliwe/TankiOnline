let LobbyBase = require('./LobbyBase')
let GameLobbySettings = require('./GameLobbySettings')
let Connection = require('../Connection')
let Bullet = require('../Bullet')

module.exports = class GameLobbby extends LobbyBase {
    constructor(id, settings = GameLobbySettings) {
        super(id);
        this.settings = settings;
        this.bullets = [];
    }

    onUpdate() {
        let lobby = this;

        lobby.updateBullets();
        lobby.updateDeadPlayers();
    }

    canEnterLobby(connection = Connection) {
        let lobby = this;
        let maxPlayerCount = lobby.settings.maxPlayers;
        let currentPlayerCount = lobby.connections.length;

        if(currentPlayerCount + 1 > maxPlayerCount) {
            return false;
        }

        return true;
    }

    onEnterLobby(connection = Connection) {
        let lobby = this;
        let socket = connection.socket;

        super.onEnterLobby(connection);

        lobby.addPlayer(connection);

        socket.emit('loadGame');

        //Handle spawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    onLeaveLobby(connection = Connection) {
        let lobby = this;

        super.onLeaveLobby(connection);

        lobby.removePlayer(connection);

        //Handle unspawning any server spawned objects here
        //Example: loot, perhaps flying bullets etc
    }

    updateBullets() {
        let lobby = this;
        let bullets = lobby.bullets;
        let connections = lobby.connections;

        bullets.forEach(bullet => {
            let isDestroyed = bullet.onUpdate();

            if(isDestroyed) {
                lobby.despawnBullet(bullet);
            } else {
                /*var returnData = {
                    id: bullet.id,
                    position: {
                        x: bullet.position.x,
                        y: bullet.position.y
                    }
                }

                connections.forEach(connection => {
                    connection.socket.emit('updatePosition', returnData);
                });*/
            }
        });
    }

    updateDeadPlayers() {
        let lobby = this;
        let connections = lobby.connections;

        connections.forEach(connection => {
            let player = connection.player;

            if(player.isDead) {
                let isRespawn = player.respawnCounter();
                if(isRespawn) {
                    let socket = connection.socket;
                    let returnData = {
                        id: player.id,
                        position: {
                            x: player.position.x,
                            y: player.position.y
                        }
                    }

                    socket.emit('playerRespawn', returnData);
                    socket.broadcast.to(lobby.id).emit('playerRespawn', returnData);
                }
            }
        });
    }
/*
    checkForWinner() {
        let lobby = this;
        let connections = lobby.connections;
                    
        let currentPlayerCount = lobby.connections.length;

        connections.forEach(connection => 
            {
            let player = connection.player;
                let socket = connection.socket;
                let returnData = 
                {
                id: player.id,
                }
                if(currentPlayerCount = 1) 
                {
                    console.log('Player with id: ' + player.id + ' has WON');
                    socket.emit('playerWon', returnData);
                    socket.broadcast.to(lobby.id).emit('playerWon', returnData);
                }
                else
                {
                    console.log('There is ' + currentPlayerCount + ' more players, who would win?');
                }
        });
    }
*/
    onFireBullet(connection = Connection, data) {
        let lobby = this;

        let bullet = new Bullet();
        bullet.name = 'Bullet';
        bullet.activator = data.activator;
        bullet.position.x = data.position.x;
        bullet.position.y = data.position.y;
        bullet.direction.x = data.direction.x;
        bullet.direction.y = data.direction.y;

        lobby.bullets.push(bullet);

        var returnData = 
        {
            name: bullet.name,
            id: bullet.id,
            activator: bullet.activator,
            position: 
            {
                x: bullet.position.x,
                y: bullet.position.y
            },
            direction: 
            {
                x: bullet.direction.x,
                y: bullet.direction.y
            },
            speed: bullet.speed
        }

        connection.socket.emit('serverSpawn', returnData);
        connection.socket.broadcast.to(lobby.id).emit('serverSpawn', returnData); //Only broadcast to those in the same lobby as us
    }

    onCollisionDestroy(connection = Connection, data) {
        let lobby = this;

        let returnBullets = lobby.bullets.filter(bullet => {
            return bullet.id == data.id
        });

        returnBullets.forEach(bullet => {
            let playerHit = false;

            lobby.connections.forEach(c => {
                let player = c.player;

                if(bullet.activator != player.id) 
                {
                    let distance = bullet.position.Distance(player.position);

                    if(distance < 1.5) {
                        let isDead = player.dealDamage(25);
                        if(isDead) 
                        {
                            if(player.lives <= 1)
                            {
                            console.log('GAMEOVER');
                            let returnData = 
                            {
                                id: player.id,
                                lives: player.lives
                            }
                            c.socket.emit('gameOver', returnData);
                            c.socket.broadcast.to(lobby.id).emit('gameOver', returnData);
                            }
                            else
                            {
                                player.lives -= 1;    
                                console.log('Player with id: ' + player.id + ' has died,' + player.lives + ' lives left');
                                let returnData = {
                                    id: player.id,
                                    lives: player.lives
                                }
                                c.socket.emit('playerDied', returnData);
                                c.socket.broadcast.to(lobby.id).emit('playerDied', returnData);
                            }
                        } 
                        else 
                        {
                            console.log('Player with id: ' + player.id + ' has (' + player.health + ') health left');
                            let returnData = {
                                id: player.id,
                                health: player.health
                            }
                            c.socket.emit('playerDamaged', returnData);
                            c.socket.broadcast.to(lobby.id).emit('playerDamaged', returnData);
                        }
                        lobby.despawnBullet(bullet);
                    }
                }
            });

            if(!playerHit) {
                bullet.isDestroyed = true;
            }
        });        
    }

    

    /*                        
    let currentPlayerCount = lobby.connections.length;

    if(currentPlayerCount = 1) 
    {
        return false;
    }
    return true;
    */


    despawnBullet(bullet = Bullet) {
        let lobby = this;
        let bullets = lobby.bullets;
        let connections = lobby.connections;

        console.log('Destroying bullet (' + bullet.id + ')');
        var index = bullets.indexOf(bullet);
        if(index > -1) {
            bullets.splice(index, 1);

            var returnData = {
                id: bullet.id
            }

            //Send remove bullet command to players
            connections.forEach(connection => {
                connection.socket.emit('serverUnspawn', returnData);
            });
        }
    }

    addPlayer(connection = Connection) {
        let lobby = this;
        let connections = lobby.connections;
        let socket = connection.socket;

        var returnData = {
            id: connection.player.id
        }

        socket.emit('spawn', returnData); //tell myself I have spawned
        socket.broadcast.to(lobby.id).emit('spawn', returnData); // Tell others

        //Tell myself about everyone else already in the lobby
        connections.forEach(c => {
            if(c.player.id != connection.player.id) {
                socket.emit('spawn', {
                    id: c.player.id
                });
            }
        });
    }

    removePlayer(connection = Connection) {
        let lobby = this;

        connection.socket.broadcast.to(lobby.id).emit('disconnected', {
            id: connection.player.id
        });
    }
}