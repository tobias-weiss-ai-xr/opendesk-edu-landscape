FROM nginx:alpine

COPY index.html styles.css script.js CNAME /usr/share/nginx/html/
COPY data/ /usr/share/nginx/html/data/
COPY hosted_logos/ /usr/share/nginx/html/hosted_logos/

EXPOSE 80
