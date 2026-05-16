const formulari = document.getElementById("formulari");

formulari.addEventListener("submit", function(event) {

event.preventDefault();

const nom = document.getElementById("nom").value.trim();
const data = document.getElementById("data").value;
const pais = document.getElementById("pais").avalue.trim();
const email = document.getElementById("email").value.trim();
const contrasenya = document.getElementById("contrasenya").value;

const error = document.getElementById("error");

let missatgeError = "";

    if (nom === "") {
        missatgeError += "El nom és obligatori.<br>";
    }

     if (data === "") {
        missatgeError += "La data és obligatoria.<br>";
    }

     if (pais === "") {
        missatgeError += "El país és obligatori.<br>";
    }

     if (email === "") {
        missatgeError += "El correu és obligatori.<br>";
    }else if (!email.includes("@")) {
        missatgeError += "El correu no és vàlid.<br>";
    }

     if (contrasenya.length < 6) {
        missatgeError += "La contrasenya ha de tenir almenys 6 caràcters.<br>";
    }

    if (missatgeError !== "") {
        error.innerHTML = missatgeError;
        error.style.color = "red";
    } else {
        error.innerHTML = "Formulari enviat correctament";
        error.style.color = "green";
    }


});

    

