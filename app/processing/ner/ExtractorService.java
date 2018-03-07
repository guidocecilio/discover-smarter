package processing.ner;

import java.util.List;

/**
 * Interface for NER service
 * @author waqar
 */
public interface ExtractorService {
    public List<NamedEntity> extract(String fileName) throws Exception;
}
