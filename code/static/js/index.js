/* javascript for index.js */
const { createApp } = Vue;

createApp({
    setup() {
        const annotateSingle = () => {
            window.location.href = 'single_image_annotation';
        };
        const annotateMultiple = () => {
            window.location.href = 'multiple_image_annotation';
        }

        return {annotateSingle, annotateMultiple };
    }
}).mount('#app');