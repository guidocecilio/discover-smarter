package processing.ner;

import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;
import mx.bigdata.jcalais.CalaisClient;
import mx.bigdata.jcalais.CalaisConfig;
import mx.bigdata.jcalais.CalaisObject;
import mx.bigdata.jcalais.CalaisResponse;
import mx.bigdata.jcalais.rest.CalaisRestClient;

/**
 * Extarcts entities using OpenCalais REST service
 * @author waqar
 */
public class OpenCalaisExtractor implements ExtractorService {
     public List<NamedEntity> extract(String fileName) throws Exception {
        List<NamedEntity> results = new ArrayList<NamedEntity>();
        results.add(new NamedEntity(fileName,"Document"));
        CalaisConfig config = new CalaisConfig();
        config.set(CalaisConfig.ConnParam.CONNECT_TIMEOUT, 50000);
        config.set(CalaisConfig.ConnParam.READ_TIMEOUT, 50000);
        CalaisClient client = new CalaisRestClient("regegstynnqw83sj6ajesjfk");
        CalaisResponse response = client.analyze(new FileReader(fileName), config);
        for (CalaisObject entity : response.getEntities())  results.add(new NamedEntity(entity.getField("name"),entity.getField("_type")));
        //for (CalaisObject entity : response.getSocialTags()) results.add(new NamedEntity(entity.getField("name"),entity.getField("_typeGroup")));
        return results;
    }
}
