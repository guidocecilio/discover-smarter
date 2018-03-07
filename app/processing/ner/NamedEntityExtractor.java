package processing.ner;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.List;
import org.codehaus.jackson.map.ObjectMapper;

/**
 * NamedEntityExtractor 
 * @author waqar
 */
public class NamedEntityExtractor {
    private ExtractorService service;  
    
    public String extractAsJson(String fileName) throws Exception {
        List<NamedEntity> entities = service.extract(fileName); 
        final OutputStream out = new ByteArrayOutputStream();
        final ObjectMapper mapper = new ObjectMapper();
        mapper.writeValue(out, entities);
        final byte[] data = ((ByteArrayOutputStream) out).toByteArray();
        return (new String(data));
    }
    
    public List<NamedEntity> extract(String fileName) throws Exception {
        return getService().extract(fileName);
    }
    /**
     * @return the service
     */
    public ExtractorService getService() {
        return service;
    }

    /**
     * @param service the service to set
     */
    public void setService(ExtractorService service) {
        this.service = service;
    }
    
     public NamedEntityExtractor(ExtractorService service) {
        this.service = service;
    }
    
}
