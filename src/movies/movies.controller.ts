import {
  Controller,
  Get,
  Param,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { Response } from 'express';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  /*
    Generates a PDF containing the list of movies Endpoint
  */

  @Get()
  async generatePopularMoviesPdf(@Res() res: Response) {
    try {
      const movies = await this.moviesService.fetchPopularMovies();
      const pdfBuffer = await this.moviesService.generateMoviesPdf(movies);
      const buffer = Buffer.from(pdfBuffer);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="popular-movies.pdf"',
        'Content-Length': buffer.length,
      });

      return res.send(buffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new HttpException(
        'Failed to generate PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/')
  async generateMoviePdf(@Param('id') id: string, @Res() res: Response) {
    const movieData = await this.moviesService.fetchMovieById(id);
    const pdfBuffer = await this.moviesService.generatePdf(movieData);

    const buffer = Buffer.from(pdfBuffer);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="movie-${id}.pdf"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
