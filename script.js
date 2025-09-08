// 古韵蛇影 - 中国古风贪吃蛇游戏
class AncientSnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('gameOverlay');
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        
        // 游戏配置
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // 游戏状态
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.level = 1;
        this.speed = 200;
        this.gameLoop = null;
        
        // 蛇的状态
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 0, y: 0 };
        
        // 食物和道具
        this.food = {};
        this.powerUps = [];
        this.particles = [];
        
        // 特殊效果
        this.shield = false;
        this.speedBoost = false;
        this.speedBoostTime = 0;
        
        // 颜色主题
        this.colors = {
            snake: '#d4af37',
            snakeHead: '#ffd700',
            food: '#ff6b6b',
            powerUp: '#4ecdc4',
            shield: '#9b59b6',
            speed: '#e74c3c',
            grid: 'rgba(212, 175, 55, 0.1)',
            background: 'rgba(26, 26, 46, 0.8)'
        };
        
        this.init();
    }
    
    init() {
        this.updateUI();
        this.generateFood();
        this.bindEvents();
        this.drawGame();
        
        // 显示开始界面
        this.showOverlay('古韵蛇影', '按空格键或点击按钮开始游戏');
    }
    
    bindEvents() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleGame();
            } else if (this.gameState === 'playing') {
                this.handleKeyPress(e.code);
            }
        });
        
        // 按钮事件
        this.startButton.addEventListener('click', () => this.startGame());
        this.pauseButton.addEventListener('click', () => this.pauseGame());
        
        // 触摸事件（移动端支持）
        let touchStartX, touchStartY;
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!touchStartX || !touchStartY) return;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            const threshold = 30;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > threshold) this.changeDirection('ArrowRight');
                else if (deltaX < -threshold) this.changeDirection('ArrowLeft');
            } else {
                if (deltaY > threshold) this.changeDirection('ArrowDown');
                else if (deltaY < -threshold) this.changeDirection('ArrowUp');
            }
            
            touchStartX = touchStartY = null;
        });
    }
    
    handleKeyPress(code) {
        this.changeDirection(code);
    }
    
    changeDirection(code) {
        const directions = {
            'ArrowUp': { x: 0, y: -1 },
            'ArrowDown': { x: 0, y: 1 },
            'ArrowLeft': { x: -1, y: 0 },
            'ArrowRight': { x: 1, y: 0 }
        };
        
        if (directions[code]) {
            const newDir = directions[code];
            // 防止蛇反向移动
            if (newDir.x !== -this.direction.x || newDir.y !== -this.direction.y) {
                this.nextDirection = newDir;
            }
        }
    }
    
    toggleGame() {
        if (this.gameState === 'menu' || this.gameState === 'gameOver') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.level = 1;
        this.speed = 200;
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 0, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.powerUps = [];
        this.particles = [];
        this.shield = false;
        this.speedBoost = false;
        this.speedBoostTime = 0;
        
        this.generateFood();
        this.hideOverlay();
        this.updateUI();
        this.gameLoop = setInterval(() => this.update(), this.speed);
        
        this.startButton.style.display = 'none';
        this.pauseButton.style.display = 'inline-block';
    }
    
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameLoop);
            this.showOverlay('游戏暂停', '按空格键继续游戏');
            this.startButton.textContent = '继续游戏';
            this.startButton.style.display = 'inline-block';
            this.pauseButton.style.display = 'none';
        }
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.hideOverlay();
        this.gameLoop = setInterval(() => this.update(), this.getCurrentSpeed());
        this.startButton.style.display = 'none';
        this.pauseButton.style.display = 'inline-block';
    }
    
    getCurrentSpeed() {
        return this.speedBoost ? this.speed * 0.5 : this.speed;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // 更新方向
        this.direction = { ...this.nextDirection };
        
        // 移动蛇头
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        // 检查边界碰撞
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            if (this.shield) {
                this.shield = false;
                this.createParticleExplosion(head.x * this.gridSize, head.y * this.gridSize, this.colors.shield);
                // 反弹效果
                head.x = Math.max(0, Math.min(this.tileCount - 1, head.x));
                head.y = Math.max(0, Math.min(this.tileCount - 1, head.y));
            } else {
                this.gameOver();
                return;
            }
        }
        
        // 检查自身碰撞
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            if (this.shield) {
                this.shield = false;
                this.createParticleExplosion(head.x * this.gridSize, head.y * this.gridSize, this.colors.shield);
            } else {
                this.gameOver();
                return;
            }
        }
        
        this.snake.unshift(head);
        
        // 检查食物碰撞
        if (head.x === this.food.x && head.y === this.food.y) {
            this.eatFood();
        } else {
            this.snake.pop();
        }
        
        // 检查道具碰撞
        this.powerUps = this.powerUps.filter(powerUp => {
            if (head.x === powerUp.x && head.y === powerUp.y) {
                this.collectPowerUp(powerUp);
                return false;
            }
            return true;
        });
        
        // 更新特殊效果时间
        if (this.speedBoost) {
            this.speedBoostTime--;
            if (this.speedBoostTime <= 0) {
                this.speedBoost = false;
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.speed);
            }
        }
        
        // 随机生成道具
        if (Math.random() < 0.005 && this.powerUps.length < 2) {
            this.generatePowerUp();
        }
        
        // 更新粒子效果
        this.updateParticles();
        
        this.drawGame();
    }
    
    eatFood() {
        this.score += 10 + (this.level - 1) * 5;
        this.createParticleExplosion(this.food.x * this.gridSize, this.food.y * this.gridSize, this.colors.food);
        this.generateFood();
        this.updateLevel();
        this.updateUI();
    }
    
    collectPowerUp(powerUp) {
        this.createParticleExplosion(powerUp.x * this.gridSize, powerUp.y * this.gridSize, powerUp.color);
        
        switch (powerUp.type) {
            case 'gem':
                this.score += 50;
                break;
            case 'speed':
                this.speedBoost = true;
                this.speedBoostTime = 100; // 5秒 (假设60fps)
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.getCurrentSpeed());
                break;
            case 'shield':
                this.shield = true;
                break;
        }
        this.updateUI();
    }
    
    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }
    
    generatePowerUp() {
        const types = [
            { type: 'gem', color: this.colors.powerUp },
            { type: 'speed', color: this.colors.speed },
            { type: 'shield', color: this.colors.shield }
        ];
        
        const powerUpType = types[Math.floor(Math.random() * types.length)];
        
        let position;
        do {
            position = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (
            this.snake.some(segment => segment.x === position.x && segment.y === position.y) ||
            (this.food.x === position.x && this.food.y === position.y) ||
            this.powerUps.some(p => p.x === position.x && p.y === position.y)
        );
        
        this.powerUps.push({
            ...position,
            ...powerUpType,
            time: 0
        });
    }
    
    updateLevel() {
        const newLevel = Math.floor(this.score / 100) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.speed = Math.max(80, 200 - (this.level - 1) * 15);
            
            // 重新设置游戏循环的速度
            if (!this.speedBoost) {
                clearInterval(this.gameLoop);
                this.gameLoop = setInterval(() => this.update(), this.speed);
            }
        }
    }
    
    createParticleExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + this.gridSize / 2,
                y: y + this.gridSize / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life--;
            return particle.life > 0;
        });
    }
    
    drawGame() {
        // 清空画布
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制食物
        this.drawFood();
        
        // 绘制道具
        this.drawPowerUps();
        
        // 绘制蛇
        this.drawSnake();
        
        // 绘制粒子效果
        this.drawParticles();
        
        // 绘制特殊效果指示器
        this.drawEffectIndicators();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (index === 0) {
                // 绘制蛇头
                this.ctx.fillStyle = this.shield ? this.colors.shield : this.colors.snakeHead;
                this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
                
                // 添加蛇头装饰
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(x + 6, y + 6, 3, 3);
                this.ctx.fillRect(x + 11, y + 6, 3, 3);
                
                if (this.shield) {
                    // 绘制护盾效果
                    this.ctx.strokeStyle = this.colors.shield;
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(x, y, this.gridSize, this.gridSize);
                }
            } else {
                // 绘制蛇身
                const gradient = this.ctx.createLinearGradient(x, y, x + this.gridSize, y + this.gridSize);
                gradient.addColorStop(0, this.colors.snake);
                gradient.addColorStop(1, '#b8860b');
                
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
                
                // 添加鳞片效果
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6);
            }
        });
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        // 绘制发光效果
        const gradient = this.ctx.createRadialGradient(
            x + this.gridSize / 2, y + this.gridSize / 2, 0,
            x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2
        );
        gradient.addColorStop(0, this.colors.food);
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0.3)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, this.gridSize, this.gridSize);
        
        // 添加仙果装饰
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(x + this.gridSize / 2 - 2, y + 2, 4, 6);
    }
    
    drawPowerUps() {
        this.powerUps.forEach(powerUp => {
            const x = powerUp.x * this.gridSize;
            const y = powerUp.y * this.gridSize;
            
            powerUp.time += 0.1;
            const pulse = Math.sin(powerUp.time) * 0.3 + 0.7;
            
            this.ctx.save();
            this.ctx.globalAlpha = pulse;
            
            const gradient = this.ctx.createRadialGradient(
                x + this.gridSize / 2, y + this.gridSize / 2, 0,
                x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2
            );
            gradient.addColorStop(0, powerUp.color);
            gradient.addColorStop(1, 'rgba(78, 205, 196, 0.3)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // 根据类型添加图标
            this.ctx.fillStyle = '#fff';
            this.ctx.font = `${this.gridSize - 8}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let icon = '';
            switch (powerUp.type) {
                case 'gem': icon = '💎'; break;
                case 'speed': icon = '⚡'; break;
                case 'shield': icon = '🛡️'; break;
            }
            
            this.ctx.fillText(icon, x + this.gridSize / 2, y + this.gridSize / 2);
            this.ctx.restore();
        });
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            this.ctx.restore();
        });
    }
    
    drawEffectIndicators() {
        if (this.speedBoost) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, 5);
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        clearInterval(this.gameLoop);
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
            this.showOverlay('新纪录！', `恭喜！你创造了新的最高纪录：${this.score}分`);
        } else {
            this.showOverlay('游戏结束', `你的得分：${this.score}分`);
        }
        
        this.updateUI();
        this.startButton.textContent = '重新开始';
        this.startButton.style.display = 'inline-block';
        this.pauseButton.style.display = 'none';
    }
    
    showOverlay(title, message) {
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayMessage').textContent = message;
        this.overlay.style.display = 'flex';
    }
    
    hideOverlay() {
        this.overlay.style.display = 'none';
    }
    
    updateUI() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
        document.getElementById('level').textContent = this.level;
    }
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
    new AncientSnakeGame();
});