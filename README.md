# Syed Tahir Ali Shah Website

This is a GitHub Pages-ready dynamic portfolio website. The page layout is in `index.html`, styling is in `assets/css/styles.css`, app behavior is in `assets/js/site.js`, and all editable profile content is in `assets/data/site-data.json`.

## Update Content

Edit `assets/data/site-data.json` to update:

- Biography, education, research interests, and languages
- Publications, filters, links, status badges, and sorting data
- Software/projects, contact cards, profile links, and footer socials
- Hero text, calls to action, and slideshow images
- Certificates shown in the certificate gallery

## Add Certificates

Put certificate PDFs/images in `assets/certificates/`, then add entries under `certificates.items` in `assets/data/site-data.json`.

Example:

```json
{
  "title": "Certificate Title",
  "issuer": "Issuing Organization",
  "date": "2026",
  "description": "Short certificate description.",
  "file": "assets/certificates/certificate.pdf",
  "thumbnail": "assets/certificates/certificate.jpg"
}
```

## Run Locally

Because the site loads JSON dynamically, run it through a local server:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Push these files to the repository and enable GitHub Pages from the repository settings. The relative asset paths work under the `/syedtahiralishah/` GitHub Pages path.
