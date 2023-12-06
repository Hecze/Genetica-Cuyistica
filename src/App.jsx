import { useEffect, useRef } from "react";
import p5 from "p5";
// import css

import "./App.css";

let canvas;
let bosqueImg; // Variable para almacenar la imagen
let scaleFactor = 1;
let cuyTextures = []; // Variable para almacenar las texturas individuales de los cuyes

const App = () => {
  const canvasRef = useRef(null);
  const p5Ref = useRef(null);
  const isPushingRef = useRef(false);

  useEffect(() => {
    const sketch = (p) => {
      let cuyes = [];
      let draggingCuy = null;
      let offset = { x: 0, y: 0 }; // Posición relativa del mouse respecto al centro del cuy
      
      class Cuy {
        constructor() {
          this.size = 130; //  ancho del cuy
          this.height = 100; //  alto del cuy
          this.x = p.random(this.size, window.innerWidth - this.size); // Posición inicial aleatoria x
          this.y = p.random(this.size, window.innerHeight - this.size); // Posición inicial aleatoria y
          this.color = p.color(p.random(255), p.random(255), p.random(255));
          this.texture = p.random(cuyTextures); // Asignar una textura de cuy aleatoria
          this.vx = 0; // Inicializamos la velocidad en 0
          this.vy = 0;
          this.isDragging = false; // Indica si el cuy está siendo arrastrado
          this.draggingStartX = 0; // Posición inicial del mouse al arrastrar
          this.draggingStartY = 0; 
          this.draggingVelocityX = 0; // Velocidad del mouse al arrastrar
          this.draggingVelocityY = 0;
          this.scaleFactor = 1.0; // Nuevo: Factor de escala predeterminad. Varia con el crecimiento del cuy
        }

        display() {
          // Dibujamos el cuy
          p.push(); // Guardamos el estado actual

          p.scale(this.scaleFactor); // Ajustamos el tamaño del cuy según el valor almacenado
          p.image(
            this.texture,
            this.x - this.size / 2,
            this.y - this.height / 2,
            this.size,
            this.height
          );
          p.pop(); // Restauramos el estado anterior
        }

        contains(x, y) {
          const isInside = p.dist(this.x, this.y, x, y) < this.size / 2;
          this.isHovered = isInside; // Actualizamos la propiedad isHovered
          return isInside;
        }

        teleportInsideCanvas() {
          //teleportar todo el cuerpo dentro del canvas
          this.x = p.random(this.size, window.innerWidth - this.size);
          this.y = p.random(this.size, window.innerHeight - this.size);
        }

        repositionInsideCanvas() {
          this.x = p5Ref.current.constrain(
            this.x,
            this.size,
            p5Ref.current.width - this.size
          );
          this.y = p5Ref.current.constrain(
            this.y,
            this.size,
            p5Ref.current.height - this.size
          );
        }
        detectCollision(otherCuy) {
          const distance = p.dist(this.x, this.y, otherCuy.x, otherCuy.y);
          return distance < (this.size + otherCuy.size) / 3;
        }

        applyForceFromCollision(otherCuy) {
          const angle = p.atan2(this.y - otherCuy.y, this.x - otherCuy.x);
          const forceMagnitude = 3; // Ajusta este valor para controlar la fuerza del empuje

          this.vx += forceMagnitude * p.cos(angle);
          this.vy += forceMagnitude * p.sin(angle);
        }

        updatePosition() {
          const resistanceFactor = 0.08; // Factor de resistencia para desacelerar el cuy
          // Actualizamos la posición del cuy mientras se está arrastrando
          if (this.isDragging) {
            this.x = p.mouseX + offset.x;
            this.y = p.mouseY + offset.y;
          }

          this.x += this.vx;
          this.y += this.vy;

          this.vx *= 1 - resistanceFactor;
          this.vy *= 1 - resistanceFactor;
          this.handleBoundaryCollision();
        }

        dragCuyStart(mouseX, mouseY) {
          this.isDragging = true;
          //tener en cuenta el sacalefactor

          offset.x = this.x - mouseX * this.scaleFactor * 1.037;
          offset.y = this.y - mouseY * this.scaleFactor * 1.037;
          this.draggingVelocityX = 0;
          this.draggingVelocityY = 0;
        }

        dragCuyEnd() {
          this.isDragging = false;
          // Calculamos la velocidad inicial basada en la velocidad mientras era arrastrado
          this.vx = this.draggingVelocityX / 5; // Puedes ajustar el valor divisor para controlar la velocidad
          this.vy = this.draggingVelocityY / 5;
        }
        handleBoundaryCollision() {
          const bounceFactor = 0.8; // Ajusta este valor para controlar la fuerza del rebote
          const radius = this.size / 2;

          // Rebotar en los bordes horizontales
          if (this.x - radius < 0) {
            this.x = radius;
            this.vx *= -bounceFactor;
          } else if (this.x + radius > p.width) {
            this.x = p.width - radius;
            this.vx *= -bounceFactor;
          }

          // Rebotar en los bordes verticales
          if (this.y - radius < 0) {
            this.y = radius;
            this.vy *= -bounceFactor;
          } else if (this.y + radius > p.height) {
            this.y = p.height - radius;
            this.vy *= -bounceFactor;
          }
        }
        isNearBoundary() {
          const distanceToBoundaryX = Math.min(
            this.x - this.size / 2,
            p.width - this.x - this.size / 2
          );
          const distanceToBoundaryY = Math.min(
            this.y - this.size / 2,
            p.height - this.y - this.size / 2
          );
          const threshold = -10; // Umbral de distancia para soltar automáticamente (puedes ajustar este valor)

          return (
            distanceToBoundaryX <= threshold || distanceToBoundaryY <= threshold
          );
        }
      }

      function handleCollisions() {
        for (let i = 0; i < cuyes.length; i++) {
          for (let j = i + 1; j < cuyes.length; j++) {
            if (cuyes[i].detectCollision(cuyes[j])) {
              cuyes[i].applyForceFromCollision(cuyes[j]);
              cuyes[j].applyForceFromCollision(cuyes[i]);
            }
          }
        }
      }

      function pickCuy() {
        for (let i = cuyes.length - 1; i >= 0; i--) {
          const cuy = cuyes[i];
          if (cuy.contains(p.mouseX, p.mouseY)) {
            draggingCuy = cuy;
            cuy.dragCuyStart(p.mouseX, p.mouseY);

            // Mueve el cuy arrastrado al final del arreglo cuyes
            cuyes.splice(i, 1);
            cuyes.push(draggingCuy);

            break;
          }
        }
      }

      function releaseCuy() {
        if (draggingCuy) {
          draggingCuy.isDragging = false;

          // Calculamos la velocidad inicial basada en la velocidad mientras era arrastrado
          draggingCuy.vx = draggingCuy.draggingVelocityX / 4.5; // Puedes ajustar el valor divisor para controlar la velocidad
          draggingCuy.vy = draggingCuy.draggingVelocityY / 4.5;
          // Ajustamos la posición del cuye usando la posición donde se soltó - la posicion donde se inicio el arrastre
          draggingCuy.x = (p.mouseX + offset.x) * 1.0382;
          draggingCuy.y = (p.mouseY + offset.y) * 1.0382;
          //draggingCuy.scaleFactor = 1; // Aumentamos el tamaño del cuy que está siendo arrastrado

          draggingCuy = null;
        }
      }

      p.preload = () => {
        // Cargamos la imagen "bosque" antes de que comience el sketch
        bosqueImg = p.loadImage("/src/assets/bosque.jpg");
        // Cargar la imagen de cuyes individuales antes de iniciar el sketch
        const cuyImage = p.loadImage("/src/assets/cuyes.png", () => {
          const gridWidth = cuyImage.width / 4; // Ancho de cada cuadro de la cuadrícula
          const gridHeight = cuyImage.height / 5; // Alto de cada cuadro de la cuadrícula
          const borderSize = 80; // Tamaño del recorte del borde (1 píxel en este caso)
          for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 4; j++) {
              const textureX = j * gridWidth + borderSize; // Agregar borderSize al inicio
              const textureY = i * gridHeight + borderSize; // Agregar borderSize al inicio
              const textureWidth = gridWidth - 2 * borderSize; // Restar el doble de borderSize
              const textureHeight = gridHeight - 2 * borderSize; // Restar el doble de borderSize
              const texture = cuyImage.get(
                textureX,
                textureY,
                textureWidth,
                textureHeight
              );
              cuyTextures.push(texture);
            }
          }
        });
      };

      p.setup = () => {
        if (!canvas) {
          canvas = p.createCanvas(window.innerWidth, window.innerHeight);
          canvas.parent("canvas-container"); // Set the canvas parent to a container div
          // Configuramos el canvas para mostrar la imagen como fondo
          p.imageMode(p.CORNER);
          p.frameRate(60);
          p.image(bosqueImg, p.width / 2, p.height / 2, p.width, p.height);
          canvas.mousePressed(pickCuy);
          canvas.mouseReleased(releaseCuy);
          for (let i = 0; i < 10; i++) {
            cuyes.push(new Cuy());
          }
        }
      };

      p.mouseMoved = () => {
        let cursorChanged = false;
        for (const cuy of cuyes) {
          if (cuy.contains(p.mouseX, p.mouseY)) {
            p.cursor(p.HAND); // Cambiar el cursor a "pointer" (mano) cuando el mouse esté sobre el cuy
            cursorChanged = true;
            cuy.brightnessValue = 1.2;
            break;
          } else {
            cuy.brightnessValue = 1.0; // Nuevo: Restablecemos el brillo del cuy que no está siendo resaltado
          }
        }
        if (!cursorChanged) {
          p.cursor(p.ARROW); // Volver al cursor predeterminado (flecha) si no está sobre ningún cuy
        }
      };

      p.mousePressed = () => {
        let foundCuy = false;
        for (const cuy of cuyes) {
          if (cuy.contains(p.mouseX, p.mouseY)) {
            draggingCuy = cuy;
            cuy.dragCuyStart(p.mouseX, p.mouseY);
            foundCuy = true;
            break;
          }
        }
        if (!foundCuy) {
          isPushingRef.current = true; // Si no se agarró ningún cuy, indicamos que estamos empujando
        }
      };

      p.mouseDragged = () => {
        if (draggingCuy) {
          draggingCuy.x = p.mouseX;
          draggingCuy.y = p.mouseY;

          // Si el cuy está cerca del borde, lo soltamos automáticamente
          if (draggingCuy.isNearBoundary()) {
            releaseCuy();
          }
        }
      };

      p.mouseReleased = () => {
        if (draggingCuy) {
          releaseCuy();
        }
        isPushingRef.current = false; // Use the .current property to update isPushing
      };

      p.windowResized = () => {
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        p.resizeCanvas(canvasWidth, canvasHeight);
        for (const cuy of cuyes) {
          cuy.repositionInsideCanvas();
        }
      };

      p.draw = () => {
        // Calculamos el factor de escala para la imagen
        scaleFactor = Math.max(
          p.width / bosqueImg.width,
          p.height / bosqueImg.height
        );

        // Calculamos las coordenadas del recorte necesario para mantener la relación de aspecto de la imagen
        const cropWidth = bosqueImg.width * scaleFactor;
        const cropHeight = bosqueImg.height * scaleFactor;
        const cropX = (p.width - cropWidth) / 2;
        const cropY = (p.height - cropHeight) / 2;

        // Dibujamos la imagen del bosque como fondo en la región recortada
        p.image(bosqueImg, cropX, cropY, cropWidth, cropHeight);

        for (const cuy of cuyes) {
          if (cuy.isDragging) {
            cuy.draggingVelocityX = p.mouseX - p.pmouseX;
            cuy.draggingVelocityY = p.mouseY - p.pmouseY;
            draggingCuy.scaleFactor = 1.04; // Aumentamos el tamaño del cuy que está siendo arrastrado
          } else {
            cuy.updatePosition(); // Actualizamos la posición del cuy en cada frame
            cuy.scaleFactor = 1.0; // Nuevo: Restablecemos el tamaño del cuy al valor predeterminado
          }

          cuy.updatePosition(); // Actualizamos la posición del cuy en cada frame
          cuy.display();
        }

        if (draggingCuy) {
          draggingCuy.x = p.mouseX;
          draggingCuy.y = p.mouseY;
        }
        if (isPushingRef.current) {
          // Si estamos empujando, buscamos cuyes cercanos al mouse y aplicamos fuerzas de empuje
          for (const cuy of cuyes) {
            const distanceToMouse = p.dist(p.mouseX, p.mouseY, cuy.x, cuy.y);
            if (distanceToMouse < cuy.size / 2.3) {
              // Si el mouse está cerca del cuy, calculamos la dirección del empuje
              const angle = p.atan2(p.mouseY - cuy.y, p.mouseX - cuy.x);
              const forceMagnitude = -1; // Ajusta este valor para controlar la fuerza del empuje

              cuy.vx += forceMagnitude * p.cos(angle);
              cuy.vy += forceMagnitude * p.sin(angle);
            }
          }
        }

        handleCollisions(); // Detectamos colisiones y aplicamos fuerzas de empuje
      };
    }; // Fin del sketch

    if (!p5Ref.current) {
      p5Ref.current = new p5(sketch, canvasRef.current);
    }

    // p.windowResized se ejecutará automáticamente cuando la ventana cambie de tamaño
    const resizeCanvas = () => {
      p5Ref.current.resizeCanvas(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resizeCanvas);

    return () => {
      p5Ref.current.remove();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return <div id="canvas-container" ref={canvasRef}></div>;
};

export default App;
