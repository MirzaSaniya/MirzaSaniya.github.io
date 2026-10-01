# Saniya Mirza: Personal Portfolio

Personal website for my work in data science, machine learning and AI. It lists projects, experience, skills, hackathons, conferences and education.

Live site: <https://saniyamirza.com>

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | All page content, navigation, metadata and links |
| `style.css` | Layout, typography, colors, light and dark themes |
| `script.js` | Theme toggle, project filters, the neural network animation, and logo and resume fallbacks |
| `CNAME` | Connects the site to the custom domain. Do not delete |
| `assets/portrait.jpg` | Profile photo for the "Beyond work" section (optional) |
| `assets/logos/` | Company, school, hackathon and conference logos (transparent PNG) |
| `docs/SaniyaMirza_Resume.pdf` | Downloadable resume (the Resume buttons appear once it exists) |

This is a static HTML, CSS and JavaScript website. There is no build step and nothing to install.

## Preview locally

Open `index.html` in a browser. Everything uses relative paths. Check the desktop and a narrow mobile layout after any change. The Resume buttons only show on the live site, because the browser can't check for the PDF from a local file.

## Publish on GitHub Pages

1. Push the website files, including `assets/` and `docs/`, to the `MirzaSaniya.github.io` repository.
2. In **Settings > Pages**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. Open <https://saniyamirza.com> and check the navigation, logos and resume download.

## Update content

- Edit the matching section in `index.html`. Keep section IDs in sync with the navigation links.
- To add a project, copy an existing `<details class="project">` block. Set `data-tags` to any of: `ml`, `forecasting`, `marketing`, `finance`, `experimentation`, `sql`, `cleaning`, `viz`, `eda`.
- To add a logo, save a transparent PNG in `assets/logos/` and use the same file name as the matching `<img>` in `index.html`. If a logo is missing, the organization's name shows instead.
- To update the resume, replace the PDF in `docs/` and keep the file name.
- To change colors, edit the CSS variables at the top of `style.css`.
- Keep the `CNAME` file in the repository root, or the custom domain will disconnect.
