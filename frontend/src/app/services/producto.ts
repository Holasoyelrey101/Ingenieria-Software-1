import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Producto {
  id: number;
  nombre: string;
  stock: number;
  alerta?: boolean; // 👈 propiedad opcional para HU2
  createdAt?: string;
  updatedAt?: string;
}


@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) {}

  getProductos(): Observable<Producto[]> {
  return this.http.get<Producto[]>(this.apiUrl);
}

}
