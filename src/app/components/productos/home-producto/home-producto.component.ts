import { Component, inject } from '@angular/core';
import { ProductoCompletoDTO } from 'src/app/dto/producto/ProductoCompletoDTO';
import { ProductoDTO } from 'src/app/dto/producto/ProductoDTO';
import { ProductoService } from 'src/app/services/domainServices/producto.service';
import { ProductoAlertService } from 'src/app/utils/product-alert/productoAlert.service';
import { MenuComponent } from '../../menu/menu.component';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActualizarProductoDTO } from 'src/app/dto/producto/ActualizarProductoDTO';
import { FormaVenta } from 'src/app/dto/formasVenta/FormaVenta';
import { EditarProductoComponent } from '../editar-producto/editar-producto.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-home-producto',
  templateUrl: './home-producto.component.html',
  styleUrls: ['./home-producto.component.css']
})
export class HomeProductoComponent {

  private productos: ProductoDTO[];
  private productosTodos!: ProductoDTO[];
  protected productosEditar!: ProductoDTO;
  protected filtroProductos: ProductoDTO[];
  protected modoOculto: boolean = true;
  protected productoAuxActualizar: ProductoDTO | null = null;
  protected ProductoNuevoActualizado: ProductoDTO | null = null; // Para almacenar el producto actualizado
  protected totalProductos: number = 0;
  modalAbierto = false;
  modalAbiertoEditar = false;
  productoSeleccionado!: ProductoCompletoDTO;
  private productoService: ProductoService = inject(ProductoService);
  private productoAlert: ProductoAlertService = inject(ProductoAlertService);
  private menuComponent: MenuComponent = inject(MenuComponent);
  protected paginaActual: number = 0;
  protected totalPaginas!: number;
  protected paginas: number[] = [];
  actualizarProductoForm!: FormGroup;
  valorFormateado: string = ''; // Para almacenar el valor con formato de dinero 
  protected valorDescuento: string | null = null;
  descuento: number = 0;
  protected formasVentaEditar: FormaVenta[];
  protected idProductoSeleccionado: string = '';
  private dialog: MatDialog = inject(MatDialog);
  rangoVisible: number = 5; // Número de paginas que se van a mostrar en el paginador

  constructor(private fb: FormBuilder) {
    this.productos = [];
    this.filtroProductos = [];
    this.formasVentaEditar = [];
  }


  ngOnInit() {
    this.obtenerProductos(0);
    this.obtenerProductosTodos();
    this.updateProductoCount();
    this.actualizarProductoForm = this.fb.group({
      codigo: ['', Validators.required],
      nombre: ['', Validators.required],
      impuesto: ['', [Validators.required, Validators.min(0)]],
      fechaCreacion: ['', Validators.required],
      formasVentas: this.fb.array([])
    });
    this.menuComponent.listarProductos();
  }

  /**
   * Este metodo se encarga de guardar en la variable productosTodos
   * todos los productos que se encuentran en LocalStorage con la variable productos
   */
  obtenerProductosTodos() {
    this.productosTodos = JSON.parse(localStorage.getItem('productos') || '[]');
  }


  /**
   * Este método se encarga de actualizar el contador de productos
   */
  private updateProductoCount() {
    this.totalProductos = this.filtroProductos.length;
  }

  /**
   * Este método se encarga de obtener los productos de la base de datos
   */
  private obtenerProductos(page: number) {
    this.productoService.getProductos(page).subscribe(data => {
      this.productos = data.content;
      this.filtroProductos = data.content.sort((a: any, b: any) => a.cantidad - b.cantidad);
      this.totalPaginas = data.totalPages;
      this.updateProductoCount();
      this.generarPaginas();
    });
  }
  /**
   * Este método se encarga de eliminar un producto de la base de datos
   * @param id es el id del producto a eliminar
   */
  protected async eliminarProductoCodigo(codigo: string) {
    const result = await this.productoAlert.eliminarProducto();
    if (result) {
      try {
        await this.productoService.eliminarProductoCodigo(codigo);
        this.obtenerProductos(0);
      } catch (error) { }
    }
  }

  /**
   * Este método se encarga de buscar un producto por su código o nombre
   * @param texto 
   */
  buscar(evento: Event): void {
    const input = (evento.target as HTMLInputElement).value.toLowerCase();
    this.filtroProductos = this.productosTodos.filter((producto: ProductoDTO) =>
      this.coincideConBusqueda(producto, input)
    ).sort((a: any, b: any) => a.cantidad - b.cantidad);
    this.updateProductoCount();
  }

  /**
   * Este método se encarga de verificar si un producto coincide con la búsqueda
   * @param producto  producto a verificar
   * @param texto  texto de búsqueda
   * @returns  un booleano que indica si el producto coincide con la búsqueda
   */
  private coincideConBusqueda(producto: ProductoDTO, texto: string): boolean {
    const { codigo, nombre } = producto;
    return (
      codigo.toString().toLowerCase().includes(texto) ||
      nombre.toLowerCase().includes(texto)
    );
  }

  /**
   * Este método se encarga de cambiar el modo de edición de un producto
   * y mostrar el formulario de edición a través de un modal
   * @param producto es el producto a editar
   */
  protected toggleModoEdicion(producto: ProductoDTO) {
    this.productosEditar = producto;
    this.editarModoOcuto()
  }

  /**
   * Este método se encarga de cambiar el modo de edición de un producto
   * @returns void
   */
  protected editarModoOcuto() {
    this.modoOculto = !this.modoOculto;
    this.obtenerProductos(0);
  }

  /**
   * Este método se encarga de cambiar a la página anterior.
   * Verifica que la página actual no sea la primera antes de retroceder
   * y luego recarga los datos correspondientes a la nueva página.
   */
  paginaAnterior() {
    if (this.paginaActual > 0) {
      this.paginaActual--;
      this.cargarVentas();
    }
  }

  /**
   * Este método se encarga de avanzar a la siguiente página.
   * Verifica que la página actual no sea la última antes de avanzar
   * y luego recarga los datos correspondientes a la nueva página.
   */
  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas - 1) {
      this.paginaActual++;
      this.cargarVentas();
    }
  }

  /**
   * Este método devuelve un arreglo con el rango de páginas que deben mostrarse
   * en la paginación, basado en la página actual y el rangoVisible definido.
   * Permite limitar el número de botones visibles en la interfaz.
   * 
   * @returns un arreglo de números que representa las páginas visibles
   */
  get paginasVisibles(): number[] {
    const mitad = Math.floor(this.rangoVisible / 2);
    let inicio = Math.max(this.paginaActual - mitad, 0);
    let fin = Math.min(inicio + this.rangoVisible, this.totalPaginas);
  
    if (fin - inicio < this.rangoVisible) {
      inicio = Math.max(fin - this.rangoVisible, 0);
    }
  
    return Array.from({ length: fin - inicio }, (_, i) => i + inicio);
  }

  /**
   * Este método carga las ventas correspondientes a la página actual,
   * llamando al método obtenerProductos y pasándole la página como parámetro.
   */
  cargarVentas() {
    this.obtenerProductos(this.paginaActual);
  }

  /**
   * Este método genera un arreglo con todos los números de página disponibles,
   * basado en el total de páginas. Este arreglo se utiliza para construir la paginación.
   */
  generarPaginas() {
    this.paginas = Array.from({ length: this.totalPaginas }, (_, index) => index);
  }

  /**
   * Este método cambia a una página específica seleccionada por el usuario
   * y recarga los datos correspondientes a esa página.
   * 
   * @param pagina número de página a la que se desea navegar
   */
  irPagina(pagina: number) {
    this.paginaActual = pagina;
    this.cargarVentas();
  }

  /**
   * Este método abre un modal con la información detallada de un producto específico,
   * identificado por su código. Si el menú lateral está abierto, lo cierra antes de continuar.
   * Luego obtiene los datos completos del producto desde el servicio correspondiente,
   * formatea las fechas de creación y vencimiento, y finalmente abre el modal.
   * 
   * @param codigo código único del producto que se desea visualizar en el modal
   */
  abrirModal(codigo: string): void {
    if (this.menuComponent.estadoMenu) {
      this.menuComponent.cerrarMenu();
    }
    this.productoService.obtenerProductoCompleto(codigo).subscribe((producto) => {
      this.productoSeleccionado = producto;
      const fechaVencimiento = producto.fechaVencimiento
        ? new Date(producto.fechaVencimiento)
        : null;
      if (fechaVencimiento) {
        fechaVencimiento.setMinutes(fechaVencimiento.getMinutes() + fechaVencimiento.getTimezoneOffset());
      }
      this.productoSeleccionado = {
        ...producto,
        fechaCreacion: new Date(producto.fechaCreacion).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        fechaVencimiento: fechaVencimiento
          ? fechaVencimiento.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : ''
      };
    });
    this.modalAbierto = true;
  }
  
  /**
   * Este método abre un modal para editar un producto específico identificado por su código.
   * Asigna el código al identificador de producto seleccionado y abre el componente de edición
   * pasándole el código como dato. Luego, cuando el modal se cierra, recarga la lista de productos
   * desde la primera página para reflejar posibles cambios.
   * 
   * @param codigo código único del producto que se desea editar
   */
  abrirModalEditar(codigo: string): void {
    this.idProductoSeleccionado = codigo;
    const dialogRef = this.dialog.open(EditarProductoComponent, {
      data: codigo,
    });
    //envio el producto al componente de editar
    dialogRef.afterClosed().subscribe(result => {
      this.obtenerProductos(0);
    });
  }
  /**
   * Este getter retorna el FormArray asociado al campo 'formasVentas'
   * dentro del formulario de actualización de producto. Permite acceder
   * y manipular dinámicamente las diferentes formas de venta del producto.
   * 
   * @returns FormArray que contiene las formas de venta del producto
   */
  get formasVentasFormArray(): FormArray {
    return this.actualizarProductoForm.get('formasVentas') as FormArray;
  }

  /**
   * Este método retorna los controles del FormArray 'formasVentas' como un arreglo de FormGroup.
   * Es útil para iterar sobre las distintas formas de venta y acceder directamente a sus campos
   * dentro del formulario de actualización de producto.
   * 
   * @returns Arreglo de FormGroup que representan cada forma de venta
   */
  formasVentasFormArrayControls(): FormGroup[] {
    return this.formasVentasFormArray.controls as FormGroup[];
  }

  /**
   * Este método se encarga de validar el formulario de actualización de producto.
   * Si es válido, extrae los datos del formulario, incluyendo las formas de venta,
   * y construye el objeto `ActualizarProductoDTO` con la información necesaria.
   * Luego, envía los datos actualizados al servicio para guardar los cambios.
   * Finalmente, cierra el modal de edición y recarga los productos en la página actual.
   * 
   * Actualmente parte del código está comentado, posiblemente en desarrollo o pruebas.
   */
  actualizarProducto(): void {
    if (this.actualizarProductoForm.valid) {
      const productoData = this.actualizarProductoForm.value;

      // Mapear las formas de venta
      const formasVentaData = productoData.formasVentas.map((forma: any) => ({
        originalNombre: forma.originalNombre,
        nuevoNombre: forma.nuevoNombre,
        precioCompra: forma.precioCompra,
        precioVenta: forma.precioVenta,
        cantidad: forma.cantidad
      }));

      const productoActualizado: ActualizarProductoDTO | null = null;/*{
        codigo: productoData.codigo,
        nombre: productoData.nombre,
        //impuesto: productoData.impuesto,
        activo: true,
        //formasVenta: formasVentaData
      };*/

      /*this.productoService.actualizar(productoActualizado).subscribe({
        next: () => {
          this.cerrarModalEditar(); 
          this.obtenerProductos(this.paginaActual); // Recargar datos
        },
        error: (err) => {
          console.error('Error al actualizar:', err);
        }
      });*/
    } else {
      console.log('Formulario inválido');
    }
  }

  /**
   * Este método cierra el modal estableciendo su estado como falso.
   * Luego, si el menú lateral está cerrado, lo vuelve a abrir automáticamente.
   */
  cerrarModal(): void {
    this.modalAbierto = false;
    if (!this.menuComponent.estadoMenu) {
      this.menuComponent.abrirMenu();
    }
  }

  /**
   * Este método se encarga de formatear el valor ingresado por el usuario en un input,
   * eliminando los caracteres no numéricos y aplicando formato con comas para mayor legibilidad.
   * Además, actualiza variables relacionadas como el valor del descuento y su representación numérica.
   * 
   * @param event evento de entrada generado por el usuario al escribir en el input
   */
  formatearValor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorSinFormato = input.value.replace(/[^\d]/g, ''); // Elimina caracteres no numéricos
    const valorNumerico = parseInt(valorSinFormato, 10);
    this.descuento = 0;

    if (!isNaN(valorNumerico)) {
      this.valorFormateado = valorNumerico.toLocaleString('en-US'); // Formato con comas
      this.valorDescuento = this.valorFormateado;
      input.value = this.valorFormateado;
      if (this.valorDescuento != '') {
        this.descuento = valorNumerico;
      }
    }
  }

}
