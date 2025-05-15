declare namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        setCenter(center: { lat: number; lng: number }): void;
        setZoom(zoom: number): void;
        addListener(event: string, handler: Function): any;
      }
      
      class Marker {
        constructor(options: any);
        setMap(map: Map | null): void;
      }
      
      interface MapMouseEvent {
        latLng?: { lat(): number; lng(): number };
      }
      
      namespace event {
        function clearListeners(instance: any, eventName: string): void;
      }
      
      enum Animation {
        DROP = 1
      }
      
      enum SymbolPath {
        CIRCLE = 0
      }
    }
  }