import { useEffect, useRef } from "react";

import p5 from "p5";

//genotipos pelaje textura base
const genotype_index = {
  "OO": "corto",
  "Oo": "corto",
  "oo": "largo",
  "LL": "lacio",
  "Ll": "lacio",
  "ll": "rizado",
  "AA": "orejas paradas",
  "Aa": "orejas paradas",
  "aa": "orejas caidas",

  /*
  6 tipos de pigmentacion: 
  blanco,  crema claro, crema, naranja,  marron y negro
  */

  //determina la cantidad de pigmento naranja
  "PPPPP": "marron", // marron
  "PPPPp": "naranja oscuro", // naranja oscuro
  "PPPpp": "naranja", // naranja
  "PPppp": "crema", // crema 
  "Ppppp": "crema claro", // crema claro
  "ppppp": "sin pigmento", // no tiene pigmento naranja


  //determinar la cantidad de pigmento negro, blanco o marron en las manchas
  "NNN": "blanco", // blanco
  "NNn": "blanco", // blanco
  "Nnn": "negro", // negro
  "nnn": "sin manchas",  // no tiene manchas




}


let canvas;
let bosqueImg; // Variable para almacenar la imagen
let scaleFactor = 1;
let cuyTextures = []; // Variable para almacenar las texturas individuales de los cuyes
const sound_agarrar = new Audio("/sounds/agarrar.mp3");
// Reducir el volumen a la mitad
sound_agarrar.volume = 0.2;


const initial_genotypes_mother = ["oo", "lL", "Aa", "Ff", "nn", "cc", "PPPPp", "NNn"]
const initial_genotypes_father = ["Oo", "ll", "Aa", "Ff", "nn", "cc", "PPppp", "nnn"]


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
        constructor(genotypes) {
          this.scaleFactor = 1; // Nuevo: Factor de escala predeterminada. Varia con el crecimiento del cuy
          this.size = 130; //  ancho del cuy
          this.height = 100; //  alto del cuy
          this.x = p.random(this.size, window.innerWidth - this.size); // Posición inicial aleatoria x
          this.y = p.random(this.size, window.innerHeight - this.size); // Posición inicial aleatoria y
          this.genotypes = genotypes
          this.color = p.color(p.random(255), p.random(255), p.random(255));
          this.texture = this.getTexture();
          this.vx = 0; // Inicializamos la velocidad en 0
          this.vy = 0;
          this.isDragging = false; // Indica si el cuy está siendo arrastrado
          this.draggingStartX = 0; // Posición inicial del mouse al arrastrar
          this.draggingStartY = 0;
          this.draggingVelocityX = 0; // Velocidad del mouse al arrastrar
          this.draggingVelocityY = 0;
        }

        //determinar la textura
        getTexture() {

          function orderByUppercaseFirst(str) {
            // Dividir la cadena en caracteres
            const chars = str.split('');

            // Filtrar y ordenar las mayúsculas
            const uppercases = chars.filter(c => c === c.toUpperCase()).sort();

            // Filtrar y ordenar las minúsculas
            const lowercases = chars.filter(c => c !== c.toUpperCase()).sort();

            // Concatenar las listas, colocando las mayúsculas primero
            return uppercases.concat(lowercases).join('');
          }

          function transformTexture(texture, genotypes) {
            // Acceder a la matriz de píxeles de la imagen.
            texture.loadPixels();

            //crear indice de string a valor rgb

            const stringToColor = {
              "blanco": [255, 255, 255],
              "crema claro": [242, 232, 219],
              "crema": [207, 181, 115],
              "naranja": [235, 137, 49],
              "naranja oscuro": [164, 100, 34],
              "marron": [73, 60, 43],
              "negro": [35, 35, 35],
              "orejas paradas": [255, 192, 203], //rosado
            }

            //inferir el color de la textura segun el index de colores
            let pigmento = genotype_index[genotypes[genotypes.length - 2]];
            let pigmento_rgb, manchas_rgb, orejas_rgb
            let manchas = genotype_index[genotypes[genotypes.length - 1]];
            let orejas = genotype_index[genotypes[genotypes.length - 6]]
            console.log(pigmento, manchas, orejas)

            if (pigmento == "sin pigmento" && manchas == "sin manchas") {
              pigmento_rgb = stringToColor["blanco"]
              manchas_rgb = stringToColor["blanco"]
            }

            else {
              if (pigmento == "sin pigmento") {
                pigmento_rgb = stringToColor[manchas]
              }
              else {
                pigmento_rgb = stringToColor[pigmento]
              }

              if (manchas == "sin manchas" || pigmento == "crema claro") {
                manchas_rgb = stringToColor[pigmento]
              }
              else {
                manchas_rgb = stringToColor[manchas]
              }
            }


            pigmento = pigmento_rgb
            manchas = manchas_rgb
            const coeficiente_de_oscuridad = 50

            if (orejas == "orejas caidas") {
              orejas = [pigmento[0] - coeficiente_de_oscuridad, pigmento[1] - coeficiente_de_oscuridad, pigmento[2] - coeficiente_de_oscuridad]
            }
            else {
              orejas = stringToColor[orejas]

            }


            for (let i = 0; i < texture.pixels.length; i += 4) {
              const r = texture.pixels[i];   // Componente rojo
              const g = texture.pixels[i + 1]; // Componente verde
              const b = texture.pixels[i + 2]; // Componente azul

              // Transformar colores según las reglas dadas.
              // Azul -> pigmento
              if (r == 0 && g == 0 && b == 255) { // Azul puro
                texture.pixels[i] = pigmento[0]
                texture.pixels[i + 1] = pigmento[1]
                texture.pixels[i + 2] = pigmento[2]
              }
              else if (r == 0 && g == 0 && b == 128) { // Azul oscuro
                texture.pixels[i] = pigmento[0] - coeficiente_de_oscuridad
                texture.pixels[i + 1] = pigmento[1] - coeficiente_de_oscuridad
                texture.pixels[i + 2] = pigmento[2] - coeficiente_de_oscuridad
              }
              // Rojo -> manchas
              else if (r == 255 && g == 0 && b == 0) { // Rojo puro
                texture.pixels[i] = manchas[0];
                texture.pixels[i + 1] = manchas[1];
                texture.pixels[i + 2] = manchas[2];
              }
              else if (r == 128 && g == 0 && b == 0) { // Rojo oscuro
                texture.pixels[i] = manchas[0] - coeficiente_de_oscuridad;
                texture.pixels[i + 1] = manchas[1] - coeficiente_de_oscuridad;
                texture.pixels[i + 2] = manchas[2] - coeficiente_de_oscuridad;
              }
              else if (r == 0 && g == 255 && b == 0) { // Verde puro
                texture.pixels[i] = pigmento[0];
                texture.pixels[i + 1] = pigmento[1];
                texture.pixels[i + 2] = pigmento[2];
              }
              else if (r == 0 && g == 128 && b == 0) { // Verde oscuro
                texture.pixels[i] = pigmento[0] - coeficiente_de_oscuridad;
                texture.pixels[i + 1] = pigmento[1] - coeficiente_de_oscuridad;
                texture.pixels[i + 2] = pigmento[2] - coeficiente_de_oscuridad;
              }
              // Amarillo -> orejas
              else if (r == 255 && g == 255 && b == 0) { // Amarillo puro
                texture.pixels[i] = orejas[0]
                texture.pixels[i + 1] = orejas[1]
                texture.pixels[i + 2] = orejas[2]
              }
              else if (r == 128 && g == 128 && b == 0) { // Amarillo oscuro
                texture.pixels[i] = orejas[0] - coeficiente_de_oscuridad
                texture.pixels[i + 1] = orejas[1] - coeficiente_de_oscuridad
                texture.pixels[i + 2] = orejas[2] - coeficiente_de_oscuridad
              }


              //celeste -> ojos
              else if (r == 0 && g == 255 && b == 255) { // celeste puro
                texture.pixels[i] = 0
                texture.pixels[i + 1] = 0
                texture.pixels[i + 2] = 0
              }
              //rosado -> nariz , del mismo color que las orejas paradas
              else if (r == 255 && g == 0 && b == 255) { // rosado
                texture.pixels[i] = stringToColor["orejas paradas"][0]
                texture.pixels[i + 1] = stringToColor["orejas paradas"][1]
                texture.pixels[i + 2] = stringToColor["orejas paradas"][2]
              }


            }

            // Aplicar los cambios.
            texture.updatePixels();

            return texture; // Devolver la imagen modificada.
          }

          const orderedGenotype1 = orderByUppercaseFirst(this.genotypes[0]);
          const orderedGenotype2 = orderByUppercaseFirst(this.genotypes[1]);
          //unicamente preguntamos por los dos primeros genotipos en el indice y sacamos la textura de /texturas_semillas_cuyes/textura.png
          //primero sumamos los dos primeros genotipos en string segun el indice y ordenas mayusculas primero
          const texture = genotype_index[orderedGenotype1] + "_" + genotype_index[orderedGenotype2];
          //public/texturas_semillas_cuyes/textura.png
          const texture_path = `/texturas_semilla_cuyes/${texture}.png`
          //ahora retornamos la imagen
          return p.loadImage(texture_path, img => {
            const transformedTexture = transformTexture(img, this.genotypes);
          });
        }

        display() {
          // Dibujamos el cuy
          p.push(); // Guardamos el estado actual

          //si el cuy es chiquito, ir agrando
          if (this.size < 130) {
            this.size += 130 * 0.001;
          }
          if (this.height < 100) {
            this.height += 100 * 0.001;
          }

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



        // Función para cruzar dos cuyes y obtener su descendencia
        static cruzar(cuy1, cuy2) {
          const newGenotypes = [];

          // Recorremos los genotipos de ambos cuyes
          for (let i = 0; i < cuy1.genotypes.length; i++) {
            const parent1 = cuy1.genotypes[i];
            const parent2 = cuy2.genotypes[i];

            // Obtenemos la longitud máxima entre los genotipos de los dos padres
            const maxLength = Math.max(parent1.length, parent2.length);

            // Creamos el genotipo del hijo combinando alelos de cada padre
            let childGenotype = "";

            for (let j = 0; j < maxLength; j++) {
              // Elegimos alelos al azar para el hijo
              const allele1 = parent1[Math.floor(Math.random() * parent1.length)];
              const allele2 = parent2[Math.floor(Math.random() * parent2.length)];

              // Seleccionamos uno de los dos alelos al azar para cada posición del genotipo del hijo
              const chosenAllele = Math.random() < 0.5 ? allele1 : allele2;

              // Añadimos el alelo seleccionado al genotipo del hijo
              childGenotype += chosenAllele;
            }

            // Ordenamos el genotipo para consistencia
            const sortedChildGenotype = childGenotype.split("").sort().join("");

            // Añadimos el genotipo del hijo al array
            newGenotypes.push(sortedChildGenotype);
          }

          // Retornamos un nuevo cuy con los genotipos resultantes del cruce
          const cuyito = new Cuy(newGenotypes);

          return cuyito;
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

          //reproducir sonido aleatorio entre ./sounds/choque1.mp3 y ./sounds/choque3.mp3
          const soundIndex = p.floor(p.random(1, 4));
          const sound = new Audio(`/sounds/choque${soundIndex}.mp3`);
          sound.volume = 0.5;
          sound.play();

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
          //reproducir sonido ./sounds/agarrar.mp3
          // evitar que se reproduzca si se está reproduciendo

          if (sound_agarrar.paused) {
            sound_agarrar.play();
          }

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
            if (cuyes[i].detectCollision(cuyes[j]) && !cuyes[i].isDragging && !cuyes[j].isDragging) { //ahora las colisiones no ocurren si lo clickeamos para permitir la reproduccion
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
        //si se soltó el cuy encima de otro cuy, reproducir
        function breedIfSameLocationAsOtherCuy() {
          for (let i = cuyes.length - 1; i >= 0; i--) {
            const cuy = cuyes[i];
            if (cuy.contains(p.mouseX, p.mouseY) && cuy !== draggingCuy) {
              const newCuy = Cuy.cruzar(draggingCuy, cuy);
              //teletransportar al cuy en medio de los padres
              newCuy.x = (draggingCuy.x + cuy.x) / 2;
              newCuy.y = (draggingCuy.y + cuy.y) / 2;

              //el cuy nace pequeño
              newCuy.size = newCuy.size / 2;
              newCuy.height = newCuy.height / 2;
              console.log("genotipos del new cuye: " + newCuy.genotypes)

              cuyes.push(newCuy);
              //reproducir sonido ./sounds/birth.mp3
              const sound = new Audio("/sounds/birth.mp3");
              sound.volume = 0.2;
              sound.play();

              break;
            }
          }
        }
        if (draggingCuy) {
          breedIfSameLocationAsOtherCuy();
        }

        draggingCuy.isDragging = false;

        // Calculamos la velocidad inicial basada en la velocidad mientras era arrastrado
        draggingCuy.vx = draggingCuy.draggingVelocityX / 4.5; // Puedes ajustar el valor divisor para controlar la velocidad
        draggingCuy.vy = draggingCuy.draggingVelocityY / 4.5;
        // Ajustamos la posición del cuye usando la posición donde se soltó - la posicion donde se inicio el arrastre
        draggingCuy.x = (p.mouseX + offset.x) * 1.0382;
        draggingCuy.y = (p.mouseY + offset.y) * 1.0382;

        draggingCuy = null;

      }


      p.preload = () => {
        // Cargamos la imagen "bosque" antes de que comience el sketch
        bosqueImg = p.loadImage("/assets/bosque.jpg");
        // Cargar la imagen de cuyes individuales antes de iniciar el sketch
        const cuyImage = p.loadImage("/assets/cuyes.png", () => {
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
          p.noSmooth(); // Desactivar el suavizado de píxeles
          // Configuramos el canvas para mostrar la imagen como fondo
          p.imageMode(p.CORNER);
          p.frameRate(60);
          p.image(bosqueImg, p.width / 2, p.height / 2, p.width, p.height);
          canvas.mousePressed(pickCuy);
          canvas.mouseReleased(releaseCuy);
          for (let i = 0; i < 1; i++) {
            cuyes.push(new Cuy(initial_genotypes_mother));
            cuyes.push(new Cuy(initial_genotypes_father));
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
