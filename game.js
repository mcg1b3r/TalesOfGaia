////// Title Scene //////

class TitleScene extends Phaser.Scene {
    constructor() { 
        super({ key: 'TitleScene' }); 
    }

    preload() {
        this.load.image("fons_menu", "assets/fons menu.png");
        this.load.image("logo_juego", "assets/logo.png"); 
    }

    create() {
        let fondo = this.add.image(320, 180, "fons_menu");
        fondo.setScale(0.32);

        let logo = this.add.image(320, 120, "logo_juego");
        logo.setScale(0.1);

        let btn = this.add.text(320, 240, "Iniciar Joc", { 
            fontSize: '24px', 
            fill: '#FF6A00', 
            fontStyle: 'bold' 
        }).setOrigin(0.5).setInteractive();
        
        btn.on('pointerdown', () => {
            this.scene.start('LoadScene'); 
        });
    }
}


//////// Load Scene //////

class LoadScene extends Phaser.Scene {
    constructor() { 
        super({ key: 'LoadScene' }); 
    }

    preload() {
        let fondoNegro = this.add.graphics();
        fondoNegro.fillStyle(0x000000, 1); 
        fondoNegro.fillRect(0, 0, 640, 360);

        this.add.text(320, 180, "Carregant...", { 
            fontSize: '32px', 
            fill: '#ffffff', 
            fontStyle: 'bold',
            fontFamily: 'Arial' 
        }).setOrigin(0.5);

        // Cargamos el mapa usando el nuevo nombre unificado sin espacios: mapa1.json
        this.load.tilemapTiledJSON("mapa1", "assets/mapa1.json");
        this.load.tilemapTiledJSON("mapa2", "assets/mapa2.json");
        this.load.image("platform", "assets/platform.png");
        this.load.image("coin", "assets/coin.png");
        this.load.image("bomb", "assets/bomb.png");
        this.load.image("enemy", "assets/enemy.png");
        this.load.image("fons", "assets/fons.png");
        this.load.audio("music", "assets/music.mp3");
         this.load.image('guspira', 'assets/guspira.png');
        this.load.spritesheet("player", "assets/player.png", { 
            frameWidth: 64, 
            frameHeight: 64 
        });

        this.load.on('loaderror', (fileObj) => {
            console.error("No se pudo cargar el archivo: " + fileObj.src);
        });
    }

    create() {
        this.time.delayedCall(2000, () => {
            this.scene.start('Level1Scene');
        }, [], this);
    }
}

/////// Level 1 Scene //////

class Level1Scene extends Phaser.Scene {
    constructor() { 
        super({ key: 'Level1Scene' }); 
    }

    init(data) {
        this.score = data.score || 0;
    }

    create() {
        const datosMapa = this.cache.tilemap.get('mapa1')?.data;
        if (!datosMapa) {
            console.error("Error: Phaser no encuentra datos válidos en 'mapa1.json'.");
            return;
        }

        this.permitirMuertePorVacio = false;
        this.time.delayedCall(1000, () => {
            this.permitirMuertePorVacio = true;
        });

        this.anchoRealMapa = datosMapa.width * datosMapa.tilewidth * 0.32;
        this.altoRealMapa = datosMapa.height * datosMapa.tileheight * 0.32;

        // 1. FONDO
        let fondo = this.add.image(0, 0, "fons").setOrigin(0, 0);
        fondo.setScrollFactor(0);
        fondo.setDisplaySize(640, 360);

        // 2. AUDIO
        this.music = this.sound.add("music", { loop: true, volume: 0.5 });
        this.music.play();

        // 3. GRUPOS FÍSICOS
        this.plataformasEstaticas = this.physics.add.staticGroup();
        this.bombs = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.coins = this.physics.add.group(); 

        let spawnX = 80;  
        let spawnY = 100; 

        if (datosMapa.layers) {
            datosMapa.layers.forEach(capa => {
                if (capa.objects && capa.name.toLowerCase().includes("player")) {
                    capa.objects.forEach(obj => {
                        spawnX = obj.x * 0.32;
                        spawnY = obj.y * 0.32;
                    });
                }
            });
        }

        // 4. JUGADOR
        this.player = this.physics.add.sprite(spawnX, spawnY, "player").setOrigin(0.5, 1);
        this.player.setScale(0.8); 
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        this.physics.world.setBounds(0, 0, this.anchoRealMapa, this.altoRealMapa);
        this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, this.anchoRealMapa, this.altoRealMapa + 100));

        // 5. ANIMACIONES
        if (!this.anims.exists('quieto')) {
            this.anims.create({ key: 'quieto', frames: [ { key: 'player', frame: 0 } ], frameRate: 20 });
        }
        if (!this.anims.exists('caminar_izq')) {
            this.anims.create({ key: 'caminar_izq', frames: [ { key: 'player', frame: 3 }, { key: 'player', frame: 5 } ], frameRate: 8, repeat: -1 });
        }
        if (!this.anims.exists('caminar_der')) {
            this.anims.create({ key: 'caminar_der', frames: [ { key: 'player', frame: 4 }, { key: 'player', frame: 6 } ], frameRate: 8, repeat: -1 });
        }
        if (!this.anims.exists('saltar_izq')) {
            this.anims.create({ key: 'saltar_izq', frames: [ { key: 'player', frame: 1 } ], frameRate: 20 });
        }
        if (!this.anims.exists('saltar_der')) {
            this.anims.create({ key: 'saltar_der', frames: [ { key: 'player', frame: 2 } ], frameRate: 20 });
        }

        this.lastDirection = 'derecha';

        // 6. PROCESADO DEL MAPA
        if (datosMapa.layers) {
            datosMapa.layers.forEach(capa => {
                if (capa.data) {
                    capa.data.forEach((tileIndex, posicion) => {
                        if (tileIndex !== 0) { 
                            let x = (posicion % capa.width) * datosMapa.tilewidth * 0.32;
                            let y = Math.floor(posicion / capa.width) * datosMapa.tileheight * 0.32;

                            if (capa.name.toLowerCase().includes("plataform")) {
                                let bloque = this.plataformasEstaticas.create(x, y, "platform").setOrigin(0, 0);
                                bloque.setScale(0.32).refreshBody(); 
                            }
                            else if (capa.name.toLowerCase().includes("moned") || capa.name.toLowerCase().includes("coin")) {
                                let coin = this.coins.create(x, y, "coin").setOrigin(0, 0);
                                coin.setScale(0.32).body.setAllowGravity(false).setImmovable(true);
                            } 
                            else if (capa.name.toLowerCase().includes("enem") && !capa.name.toLowerCase().includes("expl")) {
                                let enemy = this.enemies.create(x + 10, y + 20, "enemy").setOrigin(0.5, 1);
                                enemy.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-50);
                            }
                            else if (capa.name.toLowerCase().includes("expl") || capa.name.toLowerCase().includes("bomb")) {
                                let bomb = this.bombs.create(x + 10, y + 20, "bomb").setOrigin(0.5, 1);
                                bomb.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-50);
                            }
                        }
                    });
                }

                if (capa.objects) {
                    capa.objects.forEach(obj => {
                        let x = obj.x * 0.32;
                        let y = obj.y * 0.32;

                        if (capa.name.toLowerCase().includes("moned") || capa.name.toLowerCase().includes("coin")) {
                            let coin = this.coins.create(x, y, "coin").setOrigin(0, 1);
                            coin.setScale(0.32).body.setAllowGravity(false).setImmovable(true);
                        }
                        else if (capa.name.toLowerCase().includes("enem") && !capa.name.toLowerCase().includes("player") && !capa.name.toLowerCase().includes("expl")) {
                            let enemy = this.enemies.create(x, y, "enemy").setOrigin(0.5, 1);
                            enemy.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-50); 
                        }
                        else if (capa.name.toLowerCase().includes("expl") || capa.name.toLowerCase().includes("bomb")) {
                            let bomb = this.bombs.create(x, y, "bomb").setOrigin(0.5, 1);
                            bomb.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-50); 
                        }
                    });
                }
            });
        }

        // 7. CONTROLES Y COLISIONES
        this.cursors = this.input.keyboard.createCursorKeys();

        this.physics.add.collider(this.player, this.plataformasEstaticas);
        this.physics.add.collider(this.bombs, this.plataformasEstaticas);
        this.physics.add.collider(this.enemies, this.plataformasEstaticas);

        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);

        // 8. MARCADOR
        this.scoreText = this.add.text(12, 12, 'Puntos: ' + this.score, { 
            fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
            backgroundColor: '#000000', padding: { x: 6, y: 4 }
        });
        this.scoreText.setScrollFactor(0).setDepth(999);    
        
        
        const posX = 400; // Ajusta a la teva posició
        const posY = 500;

        const guspires = this.add.particles(0, 0, 'guspira', {
            // Rang d'aparició a la base (aproximadament l'amplada de la teva imatge de 64px)
            x: { min: 0, max: 700 },
            y: posY,

        // Moviment vertical i dispersió lateral
            speedY: { min: -120, max: -280 },
            speedX: { min: -50, max: 50 },
            gravityY: -60, 

        // Cicle de vida curt perquè es consumeixin ràpid
            lifespan: { min: 800, max: 2000 },

        // AJUST CLAU PER A 64x64: 
        // Comencen a un 15% o 20% de la seva mida real (uns 10-12px) i es redueixen a 0
            scale: { start: 0.2, end: 0 },
        
        // Desaparició suau
            alpha: { start: 1, end: 0 },

        // Degradat de color de foc i efecte de brillantor acumulativa
            color: [ 0xffff00, 0xffa500, 0xff0000 ],
            blendMode: 'ADD',

        // Generació ràpida per crear sensació de flux constant
            quantity: 6,
            frequency: 40 
    });
    }

    update() {
        if (this.physics.world.isPaused) return;

        this.player.body.setSize(this.player.displayWidth / 0.8, this.player.displayHeight / 0.8);
        this.player.body.setOffset(0, 0);

        this.enemies.children.entries.forEach(enemy => {
            enemy.body.setSize(enemy.width, enemy.height).setOffset(0, 0);
            this.controlarPatrullaEdge(enemy, -50); // Velocidad normal Nivel 1
        });

        this.bombs.children.entries.forEach(bomb => {
            bomb.body.setSize(bomb.width, bomb.height).setOffset(0, 0);
            this.controlarPatrullaEdge(bomb, -50); 
        });

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.lastDirection = 'izquierda'; 
            if (this.player.body.touching.down) this.player.anims.play('caminar_izq', true);
        } 
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.lastDirection = 'derecha'; 
            if (this.player.body.touching.down) this.player.anims.play('caminar_der', true);
        } 
        else {
            this.player.setVelocityX(0);
            if (this.player.body.touching.down) this.player.anims.play('quieto');
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
        }

        if (!this.player.body.touching.down) {
            this.player.anims.play(this.lastDirection === 'izquierda' ? 'saltar_izq' : 'saltar_der', true);
        }

        if (this.player.y > (this.altoRealMapa + 20) && this.permitirMuertePorVacio) {
            this.ejecutarGameOver();
        }
    }

    controlarPatrullaEdge(sprite, velocidadBase) {
        if (!sprite.active || !sprite.body) return;
        if (sprite.body.velocity.x === 0) { sprite.setVelocityX(velocidadBase); return; }

        if (sprite.body.touching.down || sprite.body.blocked.down) {
            let direccion = sprite.body.velocity.x > 0 ? 1 : -1;
            let sensorX = sprite.x + (direccion == 1 ? 14 : -14);
            let sensorY = sprite.y + 6;

            let haySueloDelante = false;
            this.plataformasEstaticas.children.entries.forEach(plataforma => {
                if (Phaser.Geom.Rectangle.Contains(plataforma.getBounds(), sensorX, sensorY)) haySueloDelante = true;
            });

            if (!haySueloDelante || sprite.body.blocked.left || sprite.body.blocked.right) {
                let nuevaVelocidad = sprite.body.velocity.x * -1;
                sprite.setVelocityX(nuevaVelocidad);
                sprite.x += (nuevaVelocidad > 0 ? 4 : -4);
            }
        }
    }

    collectCoin(player, coin) {
        coin.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Puntos: ' + this.score); 

        if (this.coins.countActive(true) === 0) {
            this.music.stop();
            this.scene.start('Level2Scene', { score: this.score });
        }
    }

    hitBomb(player, bomb) {
        bomb.disableBody(true, false); this.physics.pause();
        player.setTint(0xff0000); if (this.music) this.music.stop();
        let centerX = bomb.x; let centerY = bomb.y - 12;
        let particulas = this.add.particles(centerX, centerY, 'coin', {
            speed: { min: 150, max: 350 }, angle: { min: 0, max: 360 },        
            scale: { start: 0.25, end: 0 }, blendMode: 'ADD', lifespan: 700, gravityY: 150, quantity: 40                        
        });
        this.time.delayedCall(100, () => { particulas.stop(); });
        let ondaExpansiva = this.add.graphics();
        ondaExpansiva.fillStyle(0xFF3300, 1); ondaExpansiva.fillCircle(centerX, centerY, 25);
        this.tweens.add({
            targets: ondaExpansiva, alpha: 0, scaleX: 6, scaleY: 6, duration: 450, ease: 'Cubic.easeOut',
            onUpdate: () => { ondaExpansiva.clear(); ondaExpansiva.fillStyle(0xFFCC00, ondaExpansiva.alpha); ondaExpansiva.fillCircle(centerX, centerY, 30); },
            onComplete: () => { ondaExpansiva.destroy(); particulas.destroy(); bomb.destroy(); this.ejecutarGameOver(); }
        });
    }

    hitEnemy(player, enemy) {
        if ((player.body.velocity.y > 0 || enemy.body.touching.up) && player.body.bottom <= enemy.body.top + 10) {
            enemy.disableBody(true, true); player.setVelocityY(-260); this.score += 50; this.scoreText.setText('Puntos: ' + this.score); 
        } else {
            this.ejecutarGameOver();
        }
    }

    // CORREGIDO: Pantalla negra con letras rojas
    ejecutarGameOver() {
        this.physics.pause(); 
        this.player.setTint(0xff0000); 
        if (this.music) this.music.stop();
        this.time.delayedCall(1000, () => {

        // Rectángulo negro absoluto que tapa toda la pantalla
        let telonNegro = this.add.graphics();
        telonNegro.fillStyle(0x000000, 1);
        telonNegro.fillRect(0, 0, 640, 360);
        telonNegro.setScrollFactor(0).setDepth(1000);

        this.add.text(320, 180, '¡GAME OVER!\nPuntos: ' + this.score, {
            fontSize: '48px', fill: '#ff0000', fontStyle: 'bold', fontFamily: 'Arial Black',
            stroke: '#330000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        this.time.delayedCall(3000, () => {
            this.scene.start('TitleScene');
        }, [], this);
   }, [], this); 
}
}


/////// Level 2 Scene //////

class Level2Scene extends Phaser.Scene {
    constructor() { 
        super({ key: 'Level2Scene' }); 
    }

    init(data) {
        this.score = data.score || 0;
    }

    create() {
        const datosMapa = this.cache.tilemap.get('mapa2')?.data;
        if (!datosMapa) {
            console.error("Error crítico: Phaser no encuentra el archivo JSON 'mapa2.json'.");
            return;
        }
        

        // CONTROL DE SEGURIDAD: Bloquea el vacío durante el primer segundo
        this.permitirMuertePorVacio = false;
        this.time.delayedCall(1000, () => {
            this.permitirMuertePorVacio = true;
        });

        // CÁLCULO DINÁMICO DEL TAMAÑO REAL DEL MAPA EN PANTALLA
        this.anchoRealMapa = datosMapa.width * datosMapa.tilewidth * 0.32;
        this.altoRealMapa = datosMapa.height * datosMapa.tileheight * 0.32;

        this.totalCoinsInMap = 0;

        // 1. FONDO (Fijo en el horizonte)
        let fondo = this.add.image(0, 0, "fons").setOrigin(0, 0);
        fondo.setScrollFactor(0);
        fondo.setDisplaySize(640, 360);

        // 2. AUDIO
        this.music = this.sound.add("music", { loop: true, volume: 0.5 });
        this.music.play();

        // 3. GRUPOS FÍSICOS
        this.plataformasEstaticas = this.physics.add.staticGroup();
        this.bombs = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.coins = this.physics.add.group(); 

        let spawnX = 80;  
        let spawnY = 100; 

        // IDENTIFICACIÓN AUTOMÁTICA DE CAPAS
        let nombreCapaSueloReal = "";
        if (datosMapa.layers) {
            const capaSueloEncontrada = datosMapa.layers.find(l => l.data);
            if (capaSueloEncontrada) {
                nombreCapaSueloReal = capaSueloEncontrada.name;
            }
        }

        // Leer Spawn del jugador desde la capa de objetos de Tiled
        if (datosMapa.layers) {
            datosMapa.layers.forEach(capa => {
                if (capa.objects && capa.name.toLowerCase().includes("player")) {
                    capa.objects.forEach(obj => {
                        spawnX = obj.x * 0.32;
                        spawnY = obj.y * 0.32;
                    });
                }
            });
        }

        // 4. JUGADOR
        this.player = this.physics.add.sprite(spawnX, spawnY, "player").setOrigin(0.5, 1);
        this.player.setScale(0.8); 
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Ajuste de límites del mundo grande
        this.physics.world.setBounds(0, 0, this.anchoRealMapa, this.altoRealMapa);
        this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, this.anchoRealMapa, this.altoRealMapa + 100));

        this.lastDirection = 'derecha';

        // 5. PROCESADO AUTOMÁTICO DE LOS ELEMENTOS DEL MAPA 2
        if (datosMapa.layers) {
            datosMapa.layers.forEach(capa => {
                if (capa.data) {
                    capa.data.forEach((tileIndex, posicion) => {
                        if (tileIndex !== 0) { 
                            let x = (posicion % capa.width) * datosMapa.tilewidth * 0.32;
                            let y = Math.floor(posicion / capa.width) * datosMapa.tileheight * 0.32;

                            if (capa.name === nombreCapaSueloReal) {
                                let bloque = this.plataformasEstaticas.create(x, y, "platform").setOrigin(0, 0);
                                bloque.setScale(0.32).refreshBody(); 
                            }
                            else if (capa.name.toLowerCase().includes("moned") || capa.name.toLowerCase().includes("coin")) {
                                let coin = this.coins.create(x, y, "coin").setOrigin(0, 0);
                                coin.setScale(0.32).body.setAllowGravity(false).setImmovable(true);
                            } 
                            else if (capa.name.toLowerCase().includes("enem") && !capa.name.toLowerCase().includes("expl")) {
                                let enemy = this.enemies.create(x + 10, y + 20, "enemy").setOrigin(0.5, 1);
                                // ENEMIGOS: Estáticos, sin gravedad y completamente inmóviles
                                enemy.setScale(0.32).setBounce(0).setCollideWorldBounds(true);
                                enemy.body.setAllowGravity(false);
                                enemy.body.setImmovable(true);
                            }
                            else if (capa.name.toLowerCase().includes("expl") || capa.name.toLowerCase().includes("bomb")) {
                                let bomb = this.bombs.create(x + 10, y + 20, "bomb").setOrigin(0.5, 1);
                                // BOMBAS (CORREGIDO): Sí se mueven, tienen gravedad activa y rebotan en los bordes
                                bomb.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-20);
                            }
                        }
                    });
                }

                if (capa.objects) {
                    capa.objects.forEach(obj => {
                        let x = obj.x * 0.32;
                        let y = obj.y * 0.32;

                        if (capa.name.toLowerCase().includes("moned") || capa.name.toLowerCase().includes("coin")) {
                            let coin = this.coins.create(x, y, "coin").setOrigin(0, 1);
                            coin.setScale(0.32).body.setAllowGravity(false).setImmovable(true);
                        }
                        else if (capa.name.toLowerCase().includes("enem") && !capa.name.toLowerCase().includes("player") && !capa.name.toLowerCase().includes("expl")) {
                            let enemy = this.enemies.create(x, y, "enemy").setOrigin(0.5, 1);
                            enemy.setScale(0.32).setBounce(0).setCollideWorldBounds(true);
                            enemy.body.setAllowGravity(false);
                            enemy.body.setImmovable(true);
                        }
                        else if (capa.name.toLowerCase().includes("expl") || capa.name.toLowerCase().includes("bomb")) {
                            let bomb = this.bombs.create(x, y, "bomb").setOrigin(0.5, 1);
                            bomb.setScale(0.32).setBounce(0.1).setCollideWorldBounds(true).setVelocityX(-20); 
                        }
                    });
                }
            });
        }

        this.cursors = this.input.keyboard.createCursorKeys();

        // 6. ASIGNACIÓN DE COLISIONES
        this.physics.add.collider(this.player, this.plataformasEstaticas);
        this.physics.add.collider(this.bombs, this.plataformasEstaticas);
        this.physics.add.collider(this.enemies, this.plataformasEstaticas);

        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);

        // 7. MARCADOR FIJO
        this.scoreText = this.add.text(12, 12, 'Puntos: ' + this.score, { 
            fontSize: '14px', fill: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
            backgroundColor: '#000000', padding: { x: 6, y: 4 }
        });
        this.scoreText.setScrollFactor(0).setDepth(999);

        // 8. CÁMARA DE SEGUIMIENTO SUAVE
        this.cameras.main.setBounds(0, 0, this.anchoRealMapa, this.altoRealMapa);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      const amplePantalla = this.sys.game.config.width;
const altPantalla = this.sys.game.config.height;

const guspires = this.add.particles(0, 0, 'guspira', {
    x: { min: 0, max: amplePantalla },
    y: altPantalla + 10,

    speedY: { min: -120, max: -280 },
    speedX: { min: -50, max: 50 },
    gravityY: -60, 
    lifespan: { min: 800, max: 2000 },

    // 1. MÉS PETITES: Baixem la mida inicial al 12% per compensar la imatge de 64x64
    scale: { start: 0.12, end: 0 }, 
    
    alpha: { start: 0.6, end: 0 },
    color: [ 0xffff00, 0xffa500, 0xff0000 ],
    blendMode: 'ADD',

    // 2. MENYS QUANTITAT: En lloc de 6, en creem només 2 alhora
    quantity: 6, 

    // 3. MÉS ESPAIADES: En lloc de cada 40ms, neixen cada 80ms perquè no s'acumulin tant
    frequency: 80 
});

guspires.setScrollFactor(0);
    ;
    }

    update() {
        if (this.physics.world.isPaused) return;

        this.player.body.setSize(this.player.displayWidth / 0.8, this.player.displayHeight / 0.8);
        this.player.body.setOffset(0, 0);

        // Mantener hitboxes de enemigos quietos ajustadas
        this.enemies.children.entries.forEach(enemy => {
            enemy.body.setSize(enemy.width, enemy.height).setOffset(0, 0);
        });

        // BOMBAS (CORREGIDO): Ajustan su tamaño y ejecutan activamente la patrulla del vacío lenta (-20)
        this.bombs.children.entries.forEach(bomb => {
            bomb.body.setSize(bomb.width, bomb.height).setOffset(0, 0);
            this.controlarPatrullaEdge(bomb, -20); 
        });

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.lastDirection = 'izquierda'; 
            if (this.player.body.touching.down) this.player.anims.play('caminar_izq', true);
        } 
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.lastDirection = 'derecha'; 
            if (this.player.body.touching.down) this.player.anims.play('caminar_der', true);
        } 
        else {
            this.player.setVelocityX(0);
            if (this.player.body.touching.down) this.player.anims.play('quieto');
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
        }

        if (!this.player.body.touching.down) {
            this.player.anims.play(this.lastDirection === 'izquierda' ? 'saltar_izq' : 'saltar_der', true);
        }

        if (this.player.y > (this.altoRealMapa + 20) && this.permitirMuertePorVacio) {
            this.ejecutarGameOver();
        }
    }

    controlarPatrullaEdge(sprite, velocidadBase) {
        if (!sprite.active || !sprite.body) return;
        if (sprite.body.velocity.x === 0) { sprite.setVelocityX(velocidadBase); return; }

        if (sprite.body.touching.down || sprite.body.blocked.down) {
            let direccion = sprite.body.velocity.x > 0 ? 1 : -1;
            let sensorX = sprite.x + (direccion == 1 ? 14 : -14);
            let sensorY = sprite.y + 6;

            let haySueloDelante = false;
            this.plataformasEstaticas.children.entries.forEach(plataforma => {
                if (Phaser.Geom.Rectangle.Contains(plataforma.getBounds(), sensorX, sensorY)) haySueloDelante = true;
            });

            if (!haySueloDelante || sprite.body.blocked.left || sprite.body.blocked.right) {
                let nuevaVelocidad = sprite.body.velocity.x * -1;
                sprite.setVelocityX(nuevaVelocidad);
                sprite.x += (nuevaVelocidad > 0 ? 4 : -4);
            }
        }
    }

    collectCoin(player, coin) {
        coin.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Puntos: ' + this.score); 

        if (this.coins.countActive(true) === 0) {
            this.music.stop();
            this.physics.pause();
            
             this.add.text(320, 180, '¡VICTORIA!\nPuntos: ' + this.score, {
                fontSize: '40px', fill: '#00ff00', fontStyle: 'bold', fontFamily: 'Arial Black',
                stroke: '#000000', strokeThickness: 6, align: 'center' // Centra las dos líneas
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

            this.time.delayedCall(5000, () => {
                this.scene.start('TitleScene');
            }, [], this);
        }
    }

    hitBomb(player, bomb) {
        bomb.disableBody(true, false); this.physics.pause();
        player.setTint(0xff0000); if (this.music) this.music.stop();
        let centerX = bomb.x; let centerY = bomb.y - 12;
        let particulas = this.add.particles(centerX, centerY, 'coin', {
            speed: { min: 150, max: 350 }, angle: { min: 0, max: 360 },        
            scale: { start: 0.25, end: 0 }, blendMode: 'ADD', lifespan: 700, gravityY: 150, quantity: 40                        
        });
        this.time.delayedCall(100, () => { particulas.stop(); });
        let ondaExpansiva = this.add.graphics();
        ondaExpansiva.fillStyle(0xFF3300, 1); ondaExpansiva.fillCircle(centerX, centerY, 25);
        this.tweens.add({
            targets: ondaExpansiva, alpha: 0, scaleX: 6, scaleY: 6, duration: 450, ease: 'Cubic.easeOut',
            onUpdate: () => { ondaExpansiva.clear(); ondaExpansiva.fillStyle(0xFFCC00, ondaExpansiva.alpha); ondaExpansiva.fillCircle(centerX, centerY, 30); },
            onComplete: () => { ondaExpansiva.destroy(); particulas.destroy(); bomb.destroy(); this.ejecutarGameOver(); }
        });
    }

    hitEnemy(player, enemy) {
        if ((player.body.velocity.y > 0 || enemy.body.touching.up) && player.body.bottom <= enemy.body.top + 10) {
            enemy.disableBody(true, true); player.setVelocityY(-260); this.score += 50; this.scoreText.setText('Puntos: ' + this.score); 
        } else {
            this.ejecutarGameOver();
        }
    }
    ejecutarGameOver() {
        this.physics.pause(); 
        this.player.setTint(0xff0000); 
        if (this.music) this.music.stop();

    // Phaser exige: tiempo, función, argumentos de la función (vacío []), y contexto (this)
    this.time.delayedCall(1000, () => {

        let telonNegro = this.add.graphics();
        telonNegro.fillStyle(0x000000, 1);
        telonNegro.fillRect(0, 0, 640, 360);
        telonNegro.setScrollFactor(0).setDepth(1000);

        // Se usa una plantilla de cadena (backticks `) para asegurar que el texto y los puntos se fusionen sin errores de sintaxis
        this.add.text(320, 180, '¡GAME OVER!\nPuntos: ' + this.score, {
            fontSize: '48px', 
            fill: '#ff0000', 
            fontStyle: 'bold', 
            fontFamily: 'Arial Black',
            stroke: '#330000', 
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        this.time.delayedCall(3000, () => {
            this.scene.start('TitleScene');
        }, [], this);

    }, [], this); 
}
}


////// Configuración del Juego //////

const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 360,
    parent: "game-container",
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false 
        }
    },
    scene: [TitleScene, LoadScene, Level1Scene, Level2Scene] 
};

new Phaser.Game(config);