import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { firstValueFrom } from 'rxjs';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class MoviesService {

    private readonly apiKey: string;
    private readonly apiBase: string;
    private readonly imageUrl: string;
  
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,  // Inject ConfigService
  ) { 
    this.apiKey = this.configService.get<string>('API_KEY'); 
    this.apiBase = this.configService.get<string>('API_BASE_URL'); 
    this.imageUrl = this.configService.get<string>('IMAGE_URL'); 
 
  }

  async fetchPopularMovies() {
    const response = this.httpService.get(`${this.apiBase}/movie/popular`, {
        params: { api_key: this.apiKey },
      });
      const { data } = await firstValueFrom(response);
      return data.results;
    }

    async fetchMovieById(movieId: string) {
        const response = this.httpService.get(`${this.apiBase}/movie/${movieId}`, {
          params: { api_key: this.apiKey },
        });
        const { data } = await firstValueFrom(response);
        return data;
      }



      async generatePdf(movieData: any): Promise<Uint8Array> {
        
        const templatePath = path.resolve(__dirname, '..', '..', 'templates', 'movie-template.html');
    
        let htmlContent: string;
    
        try {
            htmlContent = await fs.readFile(templatePath, 'utf-8');
        } catch (error) {
            console.error('Error reading the HTML template:', error);
            throw new Error('Failed to load the HTML template');
        }
        
        htmlContent = htmlContent
            .replace('{{ title }}', movieData.title)
            .replace('{{ release_date }}', movieData.release_date)
            .replace('{{ vote_average }}', movieData.vote_average)
            .replace('{{ poster_image }}', this.imageUrl+movieData.poster_path);
    
    
        const browser = await puppeteer.launch();
    
        const page = await browser.newPage();
    
        try {
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
            });
    
            await browser.close();
            return pdfBuffer;

        } catch (error) {
            console.error('Error generating PDF:', error);
            await browser.close();
            throw new Error('Failed to generate PDF');
        }
    
}




    
}