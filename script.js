/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL = "https://bawzvocqjtezmlvupqal.supabase.co";

const SUPABASE_KEY = "sb_publishable_KUAfM_vgVNIqy1jWH3lxxg_acxz2zRe";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =========================================================
   VARIABLES
========================================================= */

let posts = [];
let likes = {};
let comments = {};

let newestFirst = true;


/* =========================================================
   ELEMENTOS HTML
========================================================= */

const postsContainer =
    document.getElementById("postsContainer");

const searchInput =
    document.getElementById("searchInput");

const clearSearch =
    document.getElementById("clearSearch");

const noResults =
    document.getElementById("noResults");

const resultText =
    document.getElementById("resultText");

const postCount =
    document.getElementById("postCount");

const likeCount =
    document.getElementById("likeCount");

const sortButton =
    document.getElementById("sortButton");

const resetSearch =
    document.getElementById("resetSearch");

const postModal =
    document.getElementById("postModal");

const modalPostContent =
    document.getElementById("modalPostContent");

const closeModal =
    document.getElementById("closeModal");


/* =========================================================
   IMÁGENES DE SUPABASE STORAGE
========================================================= */

function getImageUrl(filename) {

    return `${SUPABASE_URL}/storage/v1/object/public/images/${encodeURIComponent(filename)}`;

}


/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;

}


/* =========================================================
   FORMATEAR FECHA
========================================================= */

function formatDate(dateString) {

    const date =
        new Date(
            dateString + "T12:00:00"
        );

    return date.toLocaleDateString(
        "es-AR",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


function convertDate(dateString) {

    const parts =
        dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =========================================================
   CARGAR PUBLICACIONES
========================================================= */

async function cargarPosts() {

    const { data, error } =
        await supabaseClient
            .from("posts")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(
            "Error cargando publicaciones:",
            error
        );

        return;

    }


    console.log(
        "PUBLICACIONES RECIBIDAS:",
        data
    );


    posts =
        data.map(post => ({

            id: post.id,

            date:
                post.created_at.substring(0, 10),

            title:
                post.title,

            description:
                post.description,

            image:
                post.image

        }));

}


/* =========================================================
   CARGAR LIKES
========================================================= */

async function cargarLikes() {

    const { data, error } =
        await supabaseClient
            .from("likes")
            .select("*");


    if (error) {

        console.error(
            "Error cargando likes:",
            error
        );

        return;

    }


    likes = {};


    data.forEach(like => {

        if (!likes[like.post_id]) {

            likes[like.post_id] = [];

        }


        likes[like.post_id].push(
            like.name
        );

    });

}


/* =========================================================
   CANTIDAD DE LIKES
========================================================= */

function cantidadLikes(postId) {

    if (!likes[postId]) {
        return 0;
    }

    return likes[postId].length;

}


/* =========================================================
   COMPROBAR SI UN NOMBRE DIO LIKE
========================================================= */

function nombreYaDioLike(
    postId,
    name
) {

    if (!likes[postId]) {
        return false;
    }


    return likes[postId].some(
        existingName =>
            existingName.toLowerCase() ===
            name.toLowerCase()
    );

}


/* =========================================================
   DAR / QUITAR LIKE
========================================================= */

async function toggleLike(postId) {

    let name =
        localStorage.getItem(
            "xmartinet_nombre"
        );


    // Si ya tenemos el nombre, damos/quitar Like directamente
    if (name) {

        await realizarLike(
            postId,
            name
        );

        return;

    }


    // Si no tenemos nombre, mostramos el bloque
    const section =
        document.getElementById(
            `like-name-${postId}`
        );


    if (!section) {
        return;
    }


    section.classList.toggle("open");


    if (section.classList.contains("open")) {

        const input =
            section.querySelector(
                `[data-like-name="${postId}"]`
            );

        if (input) {
            input.focus();
        }

    }

}


/* =========================================================
   REALIZAR LIKE
========================================================= */

async function realizarLike(
    postId,
    name
) {

    name = name.trim();


    if (!name) {
        return;
    }


    /*
        Si ya dio Like, lo quitamos.
    */

    if (
        nombreYaDioLike(
            postId,
            name
        )
    ) {

        const { error } =
            await supabaseClient
                .from("likes")
                .delete()
                .eq("post_id", postId)
                .eq("name", name);


        if (error) {

            console.error(
                "Error quitando Like:",
                error
            );

            return;

        }

    }

    /*
        Si todavía no dio Like,
        lo agregamos.
    */

    else {

        const { error } =
            await supabaseClient
                .from("likes")
                .insert({

                    post_id: postId,

                    name: name

                });


        if (error) {

            console.error(
                "Error agregando Like:",
                error
            );

            return;

        }

    }


    // Guardamos el nombre
    localStorage.setItem(
        "xmartinet_nombre",
        name
    );


    await cargarLikes();


    filterPosts(
        searchInput.value.trim()
    );

}


/* =========================================================
   CARGAR COMENTARIOS
========================================================= */

async function cargarComentarios() {

    const { data, error } =
        await supabaseClient
            .from("comments")
            .select("*")
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(
            "Error cargando comentarios:",
            error
        );

        return;

    }


    comments = {};


    data.forEach(comment => {

        if (!comments[comment.post_id]) {

            comments[comment.post_id] = [];

        }


        comments[comment.post_id].push({

            id:
                comment.id,

            name:
                comment.name,

            text:
                comment.text,

            created_at:
                comment.created_at

        });

    });

}


/* =========================================================
   AGREGAR COMENTARIO
========================================================= */

async function addComment(
    postId,
    name,
    text
) {

    name =
        name.trim();

    text =
        text.trim();


    if (
        !name ||
        !text
    ) {

        return;

    }


    /*
        Comprobación local.
    */

    if (
        comments[postId] &&
        comments[postId].length >= 3
    ) {

        alert(
            "Esta publicación ya tiene 3 comentarios."
        );

        return;

    }


    /*
        Guardamos el comentario
        directamente en Supabase.
    */

    const { error } =
        await supabaseClient
            .from("comments")
            .insert({

                post_id:
                    postId,

                name:
                    name,

                text:
                    text

            });


    if (error) {

        console.error(
            "Error agregando comentario:",
            error
        );


        if (
            error.message &&
            error.message.includes(
                "máximo de 3 comentarios"
            )
        ) {

            alert(
                "Esta publicación ya tiene 3 comentarios."
            );

        }

        else {

            alert(
                "No se pudo publicar el comentario."
            );

        }


        await cargarComentarios();


        filterPosts(
            searchInput.value.trim()
        );


        return;

    }


    /*
        Recordamos el nombre.
    */

    localStorage.setItem(
        "xmartinet_nombre",
        name
    );


    /*
        Volvemos a cargar comentarios.
    */

    await cargarComentarios();


    filterPosts(
        searchInput.value.trim()
    );

}


/* =========================================================
   HTML DE COMENTARIO
========================================================= */

function createCommentHTML(
    comment
) {

    const firstLetter =
        comment.name
            .charAt(0)
            .toUpperCase();


    return `

        <div class="comment">

            <div class="comment-avatar">

                ${escapeHTML(firstLetter)}

            </div>


            <div class="comment-body">

                <div class="comment-name">

                    ${escapeHTML(
                        comment.name
                    )}

                </div>


                <div class="comment-text">

                    ${escapeHTML(
                        comment.text
                    )}

                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   CREAR PUBLICACIÓN
========================================================= */

function createPost(post) {

    const likeAmount =
        cantidadLikes(
            post.id
        );


    const postComments =
        comments[post.id] || [];


    const nombreActual =
        localStorage.getItem(
            "xmartinet_nombre"
        );


    const liked =
        nombreActual
        ?
        nombreYaDioLike(
            post.id,
            nombreActual
        )
        :
        false;


    const article =
        document.createElement(
            "article"
        );


    article.className =
        "post-card";


    article.innerHTML = `

        <div
            class="post-image-container"
            data-post-id="${post.id}">

            <img
                class="post-image"
                src="${getImageUrl(post.image)}"
                alt="${escapeHTML(post.title)}"
                loading="lazy"
                onerror="
                    this.src='https://placehold.co/600x800?text=Imagen+no+encontrada'
                ">

            <span class="post-date">

                ${formatDate(post.date)}

            </span>

        </div>


        <div class="post-content">

            ${
                post.title
                ?
                `
                <div class="post-title">

                    ${escapeHTML(
                        post.title
                    )}

                </div>
                `
                :
                ""
            }


            ${
                post.description
                ?
                `
                <div class="post-description">

                    ${escapeHTML(
                        post.description
                    )}

                </div>
                `
                :
                ""
            }

        </div>


        <div class="post-actions">

            <button
                class="like-button ${liked ? "liked" : ""}"
                data-like="${post.id}">

                ${liked ? "❤️" : "🤍"}

                <span>

                    ${likeAmount}

                </span>

            </button>


            <button
                class="comment-button"
                data-comment="${post.id}">

                💬

                <span>

                    ${postComments.length}

                </span>

            </button>

        </div>
        

        <div
            class="like-name-section"
            id="like-name-${post.id}">

            <div class="comments-title">
                Dar ❤️ Like
            </div>

            <input
                type="text"
                class="like-name-input"
                data-like-name="${post.id}"
                maxlength="30"
                placeholder="Tu nombre">

            <button
                class="like-name-submit"
                data-like-submit="${post.id}">
                Dar Like
            </button>

        </div>


        <div
            class="comments-section"
            id="comments-${post.id}">

            <div class="comments-title">

                Comentarios
                (${postComments.length}/3)

            </div>


            <div class="comments-list">

                ${
                    postComments
                        .map(
                            comment =>
                                createCommentHTML(
                                    comment
                                )
                        )
                        .join("")
                }

            </div>


            ${
                postComments.length < 3
                ?
                `
                <form
                    class="comment-form"
                    data-form="${post.id}">

                    <input
                        type="text"
                        name="name"
                        maxlength="30"
                        placeholder="Tu nombre"
                        value="${escapeHTML(
                            localStorage.getItem(
                                "xmartinet_nombre"
                            ) || ""
                        )}"
                        required>


                    <input
                        type="text"
                        name="text"
                        maxlength="200"
                        placeholder="Escribí un comentario..."
                        required>


                    <button type="submit">

                        Publicar comentario

                    </button>

                </form>
                `
                :
                `
                <div class="comment-limit">

                    Esta publicación alcanzó
                    el máximo de 3 comentarios.

                </div>
                `
            }

        </div>

    `;


    return article;

}


/* =========================================================
   RENDERIZAR PUBLICACIONES
========================================================= */

function renderPosts(
    list = posts
) {

    postsContainer.innerHTML = "";


    const sorted =
        [...list].sort(
            (a, b) => {

                const dateA =
                    new Date(a.date);

                const dateB =
                    new Date(b.date);


                return newestFirst
                    ?
                    dateB - dateA
                    :
                    dateA - dateB;

            }
        );


    if (
        sorted.length === 0
    ) {

        postsContainer.classList.add(
            "hidden"
        );

        noResults.classList.remove(
            "hidden"
        );


        resultText.textContent =
            "No hay publicaciones para esta búsqueda.";


        return;

    }


    postsContainer.classList.remove(
        "hidden"
    );

    noResults.classList.add(
        "hidden"
    );


    sorted.forEach(post => {

        postsContainer.appendChild(
            createPost(post)
        );

    });


    postCount.textContent =
        posts.length;


    updateTotalLikes();


    if (
        searchInput.value.trim()
    ) {

        resultText.textContent =
            `${sorted.length} publicación(es) encontradas`;

    }

    else {

        resultText.textContent =
            "Todas mis publicaciones";

    }

}


/* =========================================================
   TOTAL DE LIKES
========================================================= */

function updateTotalLikes() {

    let total = 0;


    posts.forEach(post => {

        total +=
            cantidadLikes(
                post.id
            );

    });


    likeCount.textContent =
        total;

}


/* =========================================================
   BUSCADOR
========================================================= */

function filterPosts(
    value
) {

    const search =
        value
            .trim()
            .toLowerCase();


    if (!search) {

        renderPosts(posts);


        clearSearch.style.display =
            "none";


        return;

    }


    clearSearch.style.display =
        "block";


    const filtered =
        posts.filter(post => {

            const iso =
                post.date
                    .toLowerCase();


            const formatted =
                formatDate(
                    post.date
                ).toLowerCase();


            const converted =
                convertDate(
                    post.date
                ).toLowerCase();


            return (
                iso.includes(search) ||
                formatted.includes(search) ||
                converted.includes(search)
            );

        });


    renderPosts(filtered);

}


/* =========================================================
   EVENTOS DE PUBLICACIONES
========================================================= */

postsContainer.addEventListener(
    "click",
    function(event) {

        /*
            LIKE
        */

        const likeButton =
            event.target.closest(
                "[data-like]"
            );


        if (likeButton) {

            const id =
                Number(
                    likeButton.dataset.like
                );


            toggleLike(id);


            return;

        }


        const likeSubmit =
            event.target.closest(
                "[data-like-submit]"
            );


        if (likeSubmit) {

            const id =
                Number(
                    likeSubmit.dataset.likeSubmit
                );


            const input =
                document.querySelector(
                    `[data-like-name="${id}"]`
                );


            if (!input) {
                return;
            }


            const name =
                input.value.trim();


            if (!name) {

                input.focus();

                return;

            }


            realizarLike(
                id,
                name
            );

            return;

        }


        /*
            COMENTARIOS
        */

        const commentButton =
            event.target.closest(
                "[data-comment]"
            );


        if (commentButton) {

            const id =
                Number(
                    commentButton.dataset.comment
                );


            const section =
                document.getElementById(
                    `comments-${id}`
                );


            if (section) {

                section.classList.toggle(
                    "open"
                );

            }


            return;

        }


        /*
            ABRIR FOTO
        */

        const imageContainer =
            event.target.closest(
                ".post-image-container"
            );


        if (imageContainer) {

            const id =
                Number(
                    imageContainer.dataset.postId
                );


            openPostModal(id);

        }

    }
);


/* =========================================================
   FORMULARIOS DE COMENTARIOS
========================================================= */

postsContainer.addEventListener(
    "submit",
    function(event) {

        const form =
            event.target.closest(
                ".comment-form"
            );


        if (!form) {

            return;

        }


        event.preventDefault();


        const postId =
            Number(
                form.dataset.form
            );


        const name =
            form.elements.name.value;


        const text =
            form.elements.text.value;


        if (
            !name.trim() ||
            !text.trim()
        ) {

            return;

        }


        addComment(
            postId,
            name,
            text
        );

    }
);


/* =========================================================
   BUSCADOR - EVENTOS
========================================================= */

searchInput.addEventListener(
    "input",
    function() {

        filterPosts(
            this.value
        );

    }
);


clearSearch.addEventListener(
    "click",
    function() {

        searchInput.value =
            "";

        filterPosts("");

        searchInput.focus();

    }
);


resetSearch.addEventListener(
    "click",
    function() {

        searchInput.value =
            "";

        filterPosts("");

    }
);


/* =========================================================
   ORDENAR
========================================================= */

sortButton.addEventListener(
    "click",
    function() {

        newestFirst =
            !newestFirst;


        if (newestFirst) {

            sortButton.textContent =
                "↓ Más recientes";

        }

        else {

            sortButton.textContent =
                "↑ Más antiguas";

        }


        filterPosts(
            searchInput.value
        );

    }
);


/* =========================================================
   MODAL
========================================================= */

function openPostModal(
    postId
) {

    const post =
        posts.find(
            p =>
                p.id === postId
        );


    if (!post) {
        return;
    }


    modalPostContent.innerHTML = `

        <img
            class="modal-post-image"
            src="${getImageUrl(post.image)}"
            alt="${escapeHTML(post.title)}"
            onerror="
                this.src='https://placehold.co/1000x800?text=Imagen+no+encontrada'
            ">


        <div class="post-content">

            ${
                post.title
                ?
                `
                <div class="post-title">

                    ${escapeHTML(
                        post.title
                    )}

                </div>
                `
                :
                ""
            }


            ${
                post.description
                ?
                `
                <div class="post-description">

                    ${escapeHTML(
                        post.description
                    )}

                </div>
                `
                :
                ""
            }


            <p
                style="
                    color:#777;
                    font-size:13px;
                ">

                ${formatDate(
                    post.date
                )}

            </p>

        </div>

    `;


    postModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";

}


function closePostModal() {

    postModal.classList.remove(
        "open"
    );


    document.body.style.overflow =
        "";

}


closeModal.addEventListener(
    "click",
    closePostModal
);


document
    .querySelector(
        ".modal-background"
    )
    .addEventListener(
        "click",
        closePostModal
    );


document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape" &&
            postModal.classList.contains(
                "open"
            )
        ) {

            closePostModal();

        }

    }
);


/* =========================================================
   MENÚ
========================================================= */

const menuButton =
    document.getElementById(
        "menuButton"
    );

const closeMenu =
    document.getElementById(
        "closeMenu"
    );

const sideMenu =
    document.getElementById(
        "sideMenu"
    );

const menuOverlay =
    document.getElementById(
        "menuOverlay"
    );


function openMenu() {

    sideMenu.classList.add(
        "open"
    );

    menuOverlay.classList.add(
        "show"
    );

}


function closeSideMenu() {

    sideMenu.classList.remove(
        "open"
    );

    menuOverlay.classList.remove(
        "show"
    );

}


menuButton.addEventListener(
    "click",
    openMenu
);


closeMenu.addEventListener(
    "click",
    closeSideMenu
);


menuOverlay.addEventListener(
    "click",
    closeSideMenu
);


/* =========================================================
   NAVEGACIÓN DEL MENÚ
========================================================= */

document
    .querySelectorAll(
        ".side-menu nav a"
    )
    .forEach(link => {

        link.addEventListener(
            "click",
            function(event) {

                event.preventDefault();


                const section =
                    this.dataset.section;


                closeSideMenu();


                if (
                    section === "inicio"
                ) {

                    window.scrollTo({

                        top: 0,

                        behavior:
                            "smooth"

                    });

                }


                if (
                    section === "fotos"
                ) {

                    document
                        .querySelector(
                            ".content-controls"
                        )
                        .scrollIntoView({

                            behavior:
                                "smooth"

                        });

                }


                if (
                    section === "perfil"
                ) {

                    document
                        .querySelector(
                            ".profile-header"
                        )
                        .scrollIntoView({

                            behavior:
                                "smooth"

                        });

                }

            }

        );

    });


/* =========================================================
   INICIALIZACIÓN
========================================================= */

async function iniciarPagina() {

    await cargarPosts();

    await cargarLikes();

    await cargarComentarios();

    filterPosts("");

}


iniciarPagina();
