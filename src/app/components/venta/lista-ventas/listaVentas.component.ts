import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { VentaDTO } from 'src/app/dto/venta/VentaDTO';
import { FullVentaDTO } from 'src/app/dto/venta/FullVentaDTO';
import { FacturaService } from 'src/app/services/domainServices/factura.service';
import { VentaService } from 'src/app/services/domainServices/venta.service';
import { CrearFacturaDTO } from 'src/app/dto/factura/CrearFacturaDTO';
import { MenuComponent } from '../../menu/menu.component';
import { CrearEFacturaDTO } from 'src/app/dto/efactura/CrearEFacturaDTO';

@Component({
  selector: 'app-lista-ventas',
  templateUrl: './lista-ventas.component.html',
  styleUrls: ['./lista-ventas.component.css']
})
export class ListaVentasComponent {

  protected ventas: VentaDTO[];
  protected ventasTodas!: VentaDTO[];
  protected ventasFiltradas: VentaDTO[];
  public sumaTotal: number = 0;
  protected modoOculto: boolean = true;
  protected formVenta!: FormGroup;
  protected ventaSeleccionada: VentaDTO | null;
  protected ventaRealizada!: FullVentaDTO;
  private fb: FormBuilder = inject(FormBuilder);
  private facturaService: FacturaService = inject(FacturaService);
  private ventaService: VentaService = inject(VentaService);
  private menuComponent: MenuComponent = inject(MenuComponent);
  protected paginaActual: number = 0;
  protected totalPaginas!: number;
  protected paginas: number[] = [];
  rangoVisible: number = 5; // Número de paginas que se van a mostrar en el paginador

  constructor() {
    this.ventas = [];
    this.ventasFiltradas = [];
    this.ventaSeleccionada = null;
  }

  ngOnInit() {
    this.ajustarRangoVisible(); 
    this.obtenerVentasTodas();
    this.obtenerVentas(0);
    this.buildForm();
  }

    /**
   * Este método ajusta dinámicamente el número de páginas visibles en la paginación
   * (`rangoVisible`) según el ancho de la pantalla. Utiliza los puntos de corte de Bootstrap:
   * 
   * - Para pantallas pequeñas (<576px), muestra 3 páginas.
   * - Para pantallas medianas (>=576px y <768px), muestra 5 páginas.
   * - Para pantallas grandes (>=768px), muestra 7 páginas.
   */
    ajustarRangoVisible(): void {
      const anchoPantalla = window.innerWidth;
      if (anchoPantalla < 576) { // Bootstrap 'sm' breakpoint
        this.rangoVisible = 3;
      } else if (anchoPantalla >= 768) {
        this.rangoVisible = 7;
      } else {
        this.rangoVisible = 5; // Para pantallas medianas
      }
    }

  /**
   * Método para construir el formulario
   */
  private buildForm() {
    this.formVenta = this.fb.group({
      fecha: [this.getFechaActual()]
    });
  }

    /**
   * Este metodo se encarga de guardar en la variable clientesTodos
   * todos los clientes que se encuentran en LocalStorage con la variable clientes
   */
  obtenerVentasTodas() {
    this.ventasTodas = JSON.parse(localStorage.getItem('ventas') || '[]');
    this.ventasFiltradas = this.ventasTodas;
    this.ventas = this.ventasTodas;
  }

    /**
     * Busca una venta por su cliente
     * @param cliente 
     */
    protected buscar(event: Event): void {
      const inputElement = event.target as HTMLInputElement;
      const busqueda = inputElement.value.trim().toLowerCase();
      console.log(this.ventasTodas);
      this.ventasFiltradas = this.ventasTodas.filter((venta: VentaDTO) =>
        this.coincideBusqueda(venta, busqueda)
      );
    }

    /**
     * Este método verifica si un cliente coincide con la búsqueda
     * @param cliente DTO del cliente
     * @param busqueda String de búsqueda
     * @returns boolean que indica si el cliente coincide con la búsqueda
     */
    private coincideBusqueda(venta: VentaDTO, busqueda: string): boolean {
      return (
        venta.id.toString().includes(busqueda) ||
        venta.cliente.toLowerCase().includes(busqueda) ||
        venta.total.toString().includes(busqueda)
      );
    }

  /**
   * Este método se encarga de obtener las ventas de la base de datos
   * a través del servicio de ventas
   */
  public obtenerVentas(page: number) {
    this.ventaService.obtenerVentas(page).subscribe(data => {
      this.ventasFiltradas = data.content;
      this.totalPaginas = data.totalPages;
      this.ventas = data.content;
      this.generarPaginas();
    })
  }

  /**
   * Método para imprimir una factura
   * en el servicio de factura
   * @param factura
   */
  protected confirmarGenerarFactura(idVenta: number | undefined) {
    if (this.ventaSeleccionada) {
      this.facturaService.imprimirFactura(this.ventaRealizada);
      if (idVenta != undefined && idVenta != null) {
        let factura = new CrearFacturaDTO(idVenta);
        this.facturaService.crearFactura(factura);
      }
    }
  }

  /**
   * Método para cerrar la previsualización de una venta
   * y limpiar los datos de la venta seleccionada
   */
  protected cerrarPrevisualizacion() {
    this.ventaSeleccionada = null;
  }

  /**
   * Este método se encarga de mostrar la previsualización de una venta
   * con los detalles de la venta seleccionada
   * @param venta contiene los datos de la venta seleccionada
   */
  protected mostrarPrevisualizacion(venta: VentaDTO) {
    if (this.menuComponent.estadoMenu) {
      this.menuComponent.cerrarMenu();
    }
    this.ventaSeleccionada = venta;
    this.ventaService.obtenerVenta(venta.id).subscribe(data => {
      this.ventaRealizada = data;
    });
  }

  /**
   * Este método se encarga de cerrar el menu y asi
   * evita que se genere un bug con la ventana emergente
   */
  cerrarMenu() {
    if (!this.menuComponent.estadoMenu) {
      this.menuComponent.toggleCollapse();
    }
    console.log('el menu esta', this.menuComponent.estadoMenu);
  }

  /**
   * Método para filtrar las ventas por fecha
   */
  public filtrarFecha() {
    let fecha = this.formVenta.get('fecha')?.value;
    this.ventasFiltradas = this.ventasTodas.filter((venta: VentaDTO) =>
      venta.fecha.includes(fecha)
    );
  }

  /**
   * Establece la fecha actual en el formato 'YYYY/MM/DD'
   * @returns la fecha actual en formato 'YYYY/MM/DD' 
   */
  private getFechaActual(): string {
    const today = new Date();
    const formattedDate1 = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
    return formattedDate1;
  }

  /**
   * Método para obtener los datos de la base de datos
   */
  protected reset() {
    this.obtenerVentas(0);
  }

  /**
   * Este método se encarga de eliminar una venta de la base de datos
   * @param idVenta es el id de la venta a eliminar
   */
  public eliminarVenta(idVenta: number) {
    if (this.menuComponent.estadoMenu) {
      this.menuComponent.cerrarMenu();
    }
    this.ventaService.preguntarEliminarVenta().then((result) => {
      if (result) {
        this.eliminarVentaSinConfirmar(idVenta);
      }
    });
  }

  private eliminarVentaSinConfirmar(idVenta: number) {
    this.ventaService.eliminarVenta(idVenta).subscribe(
      { next: () => { this.obtenerVentas(0); } }
    );
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
      this.obtenerVentas(this.paginaActual);
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

  generarFacturaE(ventaId: number) {
    let factura = CrearEFacturaDTO.crearCrearEFacturaDTO(ventaId);
    this.ventaService.crearEFactura(factura);
  }
}