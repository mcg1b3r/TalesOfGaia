    // 3. Cargar Mapa de Tiled de forma correcta
    const map = this.make.tilemap({ key: "mapaToG" });

    
    // IMPORTANTE: El primer parámetro debe ser el NOMBRE EXACTO del tileset DENTRO de Tiled
    const tiles = map.addTilesetImage("platform", "platform");

    // Crear la capa visual (el primer parámetro es el nombre de la capa en Tiled)
    const capaPlataformes = map.createLayer("plataformes", tiles);

    // Definir colisiones en las celdas que no estén vacías (-1)
    capaPlataformes.setCollisionByExclusion([-1]);

 

    // 4. Jugador
    this.player = this.physics.add.sprite(100, 200, "player");
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(true);


    
    // 5. Controles
    this.cursors = this.input.keyboard.createCursorKeys();

    ////// CÀMERA //////
    this.cameras.main.setBounds( 0, 0, map.widthInPixels, map.heightInPixels );
    this.physics.world.setBounds( 0, 0, map.widthInPixels, map.heightInPixels );
    this.cameras.main.startFollow(this.player);

    // 6. Grupos Físicos de Objetos
    this.coins = this.physics.add.group();
    this.bombs = this.physics.add.group();

    // Generar monedas
    for (let i = 0; i < 8; i++) {
        let coin = this.coins.create(100 + i * 60, 50, "coin");
        coin.setBounce(0.3); // Reducido el bounce a 0.3 (con 1 rebotan infinitamente)
        coin.setCollideWorldBounds(true);
        coin.setVelocity(Phaser.Math.Between(-50, 50), 20);
    }

    // 7. COLISIONES DEL JUEGO (Conectadas a la capa del mapa Tiled)
    this.physics.add.collider(this.player, capaPlataformes);
    this.physics.add.collider(this.coins, capaPlataformes);
    this.physics.add.collider(this.bombs, capaPlataformes);

    // Overlaps para recolectar e interactuar
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    this.physics.add.overlap(this.player, this.bombs, this.hitBomb, null, this);

    // 8. Marcador de puntuación
    this.scoreText = this.add.text(20, 20, "Punts: " + this.score, {
        fontSize: "32px",
        fill: "#fff",
        fontStyle: "bold"
    });
    this.scoreText.setStroke("#000000", 4);
}

    update() {
        // MOVIMIENTO DEL JUGADOR (Faltaba añadir este bloque de lógica)
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-220);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(220);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-420);
        }
    }

    // FUNCIÓN: Recolectar Monedas (Faltaba definirla)
    collectCoin(player, coin) {
        coin.disableBody(true, true); // Hace desaparecer la moneda recolectada
        this.score += 10;
        this.scoreText.setText("Punts: " + this.score);
    }

    // FUNCIÓN: Impacto con Bomba (Faltaba definirla)
    hitBomb(player, bomb) {
        this.physics.pause(); // Congela las físicas del juego
        player.setTint(0xff0000); // Pinta al héroe de rojo
        
        // Espera un segundo y salta a la escena de Game Over pasando el nivel afectado
        this.time.delayedCall(1000, () => {
            this.scene.start('GameOverScene', { numNivel: 1 });
        }, [], this);
    }