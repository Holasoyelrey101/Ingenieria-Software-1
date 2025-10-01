import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InventarioComponent } from './components/inventario/inventario'; // 

@Component({
  selector: 'app-root',
  standalone: true, // 
  imports: [RouterOutlet, InventarioComponent], // 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
