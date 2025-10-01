import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductoService, Producto } from '../../services/producto';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],   // 
  templateUrl: './inventario.html',
  styleUrl: './inventario.css'
})
export class InventarioComponent implements OnInit {
  productos: Producto[] = [];

  constructor(private productoService: ProductoService) {}

  ngOnInit(): void {
    this.productoService.getProductos().subscribe(data => {
      console.log('📦 Datos recibidos del backend:', data); // 
      this.productos = data;
    });
  }
}
