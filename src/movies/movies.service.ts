import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import * as puppeteer from "puppeteer";
import { firstValueFrom } from "rxjs";
import { promises as fs } from "fs";
import * as path from "path";

@Injectable()
export class MoviesService {
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly imageUrl: string;
  private readonly localLink: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>("API_KEY");
    this.apiBase = this.configService.get<string>("API_BASE_URL");
    this.imageUrl = this.configService.get<string>("IMAGE_URL");
    this.localLink = this.configService.get<string>("LOCAL_LINK");
  }

  /*
   * Fetches a list of popular movies from the external movie API.
   * The request is limited to the first page of results by default.
   * Returns a list of popular movies.
   */

  async fetchPopularMovies() {
    const response = await firstValueFrom(
      this.httpService.get(`${this.apiBase}/popular`, {
        params: { api_key: this.apiKey },
      })
    );

    // By default we only fetch the first page movies
    // if we ever need to fetch all pages movies we need to loop depending on the number of pages

    return response.data.results;
  }

  /*
   * Fetches data for a single movie by its ID from the external movie API.
   * Returns an object containing details of the specified movie.
   */

  async fetchMovieById(movieId: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.apiBase}/${movieId}`, {
        params: { api_key: this.apiKey },
      })
    );

    return response.data;
  }

  /*
   * Generates a PDF document for a specific movie.
   * Utilizes a pre-defined HTML template, injecting movie data into placeholders.
   * Creates and returns a PDF buffer with movie details.
   */

  async generatePdf(movieData: any): Promise<Uint8Array> {
    const templatePath = path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "movie-template.html"
    );

    let htmlContent: string;

    try {
      htmlContent = await fs.readFile(templatePath, "utf-8");
    } catch (error) {
      console.error("Error reading the HTML template:", error);
      throw new Error("Failed to load the HTML template");
    }

    htmlContent = htmlContent
      .replace("{{ title }}", movieData.title)
      .replace("{{ release_date }}", movieData.release_date)
      .replace("{{ vote_average }}", movieData.vote_average)
      .replace("{{ poster_image }}", this.imageUrl + movieData.poster_path);

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      console.error("Error generating PDF:", error);
      await browser.close();
      throw new Error("Failed to generate PDF");
    }
  }

  /*
   * Generates a PDF document containing a list of popular movies.
   * Uses a pre-defined template and loops through movies data to fill in each movie placeholder.
   * Creates and returns a PDF buffer containing multiple movies and links to their PDF by ID generation.
   */

  async generateMoviesPdf(moviesData: any): Promise<Uint8Array> {
    const movieListHtml = moviesData
      .map(
        (movie) => `
    <div class="card mb-3">
    <div class="row g-0">
      <div class="col-md-8">
        <div class="card-body">
          <a href="${this.localLink}/movies/${movie.id}"  target="_blank"> <h5 class="card-title">${movie.title}</h5></a>
          <p class="card-text"><strong>Release Date:</strong> ${movie.release_date}</p>
          <p class="card-text"><strong>Vote Average:</strong> ${movie.vote_average}</p>
        </div>
      </div>
    </div>
  </div>
  `
      )
      .join("");

    const templatePath = path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "popular-movies-template.html"
    );
    let htmlContent = await fs.readFile(templatePath, "utf-8");

    htmlContent = htmlContent.replace("{{ movies }}", movieListHtml);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    return pdfBuffer;
  }
}
