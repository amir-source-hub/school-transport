import { Injectable } from '@nestjs/common';

@Injectable()
export class ReadinessState {
  private draining = false;
  beginDraining() { this.draining = true; }
  get isDraining() { return this.draining; }
}
