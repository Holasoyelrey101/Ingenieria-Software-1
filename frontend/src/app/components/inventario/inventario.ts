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
    const agrupados: any = {};
    data.forEach(p => {
      if (!agrupados[p.nombre]) {
        agrupados[p.nombre] = { ...p, stock: 0 };
      }
      agrupados[p.nombre].stock += p.stock;
    });
    this.productos = Object.values(agrupados);
  });
}
}
